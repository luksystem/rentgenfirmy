-- ROT: domkniecie wymiaru etapu. Trzy dodatki do report_rot_items() (migracja 305/308 dodaly
-- stage_id/stage_title/origin_stage_id/move_count — ten plik dodaje reszte, bez rename, bez
-- dubli):
--   1. carry_over_reason (kolumna na process_kanban_tasks, jak origin_stage_id/move_count — sam
--      zapis, bez pisarza; mechanizm przenoszenia powstaje w 11c) + origin_stage_title (rezolucja
--      tytulu etapu pochodzenia, dotad byl tylko surowy id).
--   2. inferred_stage_id/inferred_stage_title — TYLKO dla zmian projektowych/ustalen bez
--      WYPELNIONEGO stage_id: etap wyliczony z project_stage_history (w ktorym etapie byl projekt
--      w chwili powstania pozycji). Swiadomie NIE zapisywane do stage_id — to zgadniecie, nie
--      wskazanie ("zmiana zgloszona w etapie 6 moze dotyczyc etapu 8"). Zero wnioskowania dla
--      kanbana (etap zawsze pewny, z tablicy) i szybkich ofert (brak zrodla wnioskowania).

alter table public.process_kanban_tasks
  add column carry_over_reason text;

comment on column public.process_kanban_tasks.carry_over_reason is
  'Warunek powrotu przy ostatnim przeniesieniu (np. "sufit zamontowany") — przygotowanie pod 11c, '
  'jak origin_stage_id/move_count. Nikt go dzis nie ustawia — mechanizm przenoszenia jeszcze nie '
  'istnieje.';

drop function public.report_rot_items(integer, integer, integer);

create function public.report_rot_items(
  p_review_buffer_days integer default 3,
  p_review_waiting_client_days integer default 7,
  p_review_default_interval_days integer default 14
)
returns table(
  source_type text, source_id uuid, project_id uuid, project_name text, title text, rot_status text,
  category text, detail text, opened_at timestamp with time zone, days_open integer, review_date date,
  termin date, stage_id text, stage_title text, origin_stage_id text, move_count integer,
  effective_review_date date, origin_stage_title text, carry_over_reason text,
  inferred_stage_id text, inferred_stage_title text
)
language sql
stable
set search_path to 'public'
as $function$
  with kanban_items as (
    select
      'kanban'::text as source_type,
      t.id as source_id,
      ppi.project_id,
      p.name as project_name,
      t.title,
      c.rot_status,
      c.category,
      c.title as detail,
      t.created_at as opened_at,
      null::date as termin,
      s.id::text as stage_id,
      s.title as stage_title,
      t.origin_stage_id,
      t.move_count,
      os.title as origin_stage_title,
      t.carry_over_reason,
      null::text as inferred_stage_id,
      null::text as inferred_stage_title
    from process_kanban_tasks t
    join process_kanban_columns c on c.id = t.column_id
    join process_kanban_boards b on b.id = c.board_id
    join project_process_items ppi on ppi.id = b.project_process_item_id
    join projects p on p.id = ppi.project_id
    left join process_items pi on pi.id = ppi.template_item_id
    left join process_milestones m on m.id = pi.milestone_id
    left join process_stages s on s.id = m.stage_id
    left join process_stages os on os.id::text = t.origin_stage_id
    where t.closed_at is null
      and c.is_rejestr_tematow
      and c.rot_status is not null
  ),
  change_request_items as (
    select
      'zmiana_projektowa'::text as source_type,
      cr.id as source_id,
      cr.project_id,
      p.name as project_name,
      cr.title,
      case cr.status
        when 'pending_client' then 'CZEKA_NA_ZEWNETRZNE'
        when 'accepted' then 'ZAMKNIETE'
        when 'rejected' then 'ZAMKNIETE'
        when 'cancelled' then 'ZAMKNIETE'
      end as rot_status,
      case cr.status
        when 'pending_client' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Zmiana projektowa'::text as detail,
      coalesce(cr.submitted_at, cr.created_at) as opened_at,
      deadline.termin,
      cr.stage_id,
      stage.title as stage_title,
      null::text as origin_stage_id,
      null::integer as move_count,
      null::text as origin_stage_title,
      null::text as carry_over_reason,
      inferred.stage_id as inferred_stage_id,
      inferred.stage_title as inferred_stage_title
    from project_change_requests cr
    join projects p on p.id = cr.project_id
    left join lateral (
      select min((pp.milestone_dates ->> ms.id::text)::date) as termin
      from process_milestones ms
      join project_processes pp on pp.project_id = cr.project_id
      where ms.stage_id::text = cr.acceptance_deadline_stage_id
        and pp.milestone_dates ? ms.id::text
    ) deadline on true
    left join process_stages stage on stage.id::text = cr.stage_id
    left join lateral (
      select h.stage_id, hs.title as stage_title
      from project_stage_history h
      left join process_stages hs on hs.id::text = h.stage_id
      where h.project_id = cr.project_id
        and h.entered_at <= coalesce(cr.submitted_at, cr.created_at)
        and (h.exited_at is null or h.exited_at > coalesce(cr.submitted_at, cr.created_at))
      limit 1
    ) inferred on cr.stage_id is null
    where cr.status in ('pending_client', 'accepted', 'rejected', 'cancelled')
  ),
  service_offer_items as (
    select
      'szybka_oferta'::text as source_type,
      s.id as source_id,
      s.project_id,
      p.name as project_name,
      s.title,
      case
        when s.client_offer_status = 'accepted'
          and s.status in ('Do rozliczenia', 'Rozliczony', 'Rozliczanie', 'Fakturowanie', 'Zakończona', 'Anulowany')
          then 'ZAMKNIETE'
        else
          case s.client_offer_status
            when 'pending' then 'CZEKA_NA_ZEWNETRZNE'
            when 'negotiation' then 'W_TOKU'
            when 'accepted' then 'W_TOKU'
            when 'rejected' then 'ZAMKNIETE'
          end
      end as rot_status,
      case s.client_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Oferta'::text as detail,
      coalesce(s.client_offer_responded_at, s.created_at) as opened_at,
      case when s.client_offer_status = 'pending' then s.client_offer_expires_at::date else null end as termin,
      null::text as stage_id,
      null::text as stage_title,
      null::text as origin_stage_id,
      null::integer as move_count,
      null::text as origin_stage_title,
      null::text as carry_over_reason,
      null::text as inferred_stage_id,
      null::text as inferred_stage_title
    from services s
    join projects p on p.id = s.project_id
    where s.service_type = 'Prace dodatkowe'
      and s.project_id is not null
      and s.client_offer_status is not null

    union all

    select
      'szybka_oferta'::text,
      s.id,
      s.project_id,
      p.name,
      s.title,
      case s.settlement_offer_status
        when 'pending' then 'CZEKA_NA_ZEWNETRZNE'
        when 'negotiation' then 'W_TOKU'
        when 'accepted' then 'ZAMKNIETE'
        when 'rejected' then 'ZAMKNIETE'
      end,
      case s.settlement_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end,
      'Rozliczenie'::text,
      coalesce(s.settlement_offer_responded_at, s.created_at),
      case when s.settlement_offer_status = 'pending' then s.settlement_offer_expires_at::date else null end,
      null::text,
      null::text,
      null::text,
      null::integer,
      null::text,
      null::text,
      null::text,
      null::text
    from services s
    join projects p on p.id = s.project_id
    where s.service_type = 'Prace dodatkowe'
      and s.project_id is not null
      and s.settlement_offer_status is not null
  ),
  agreement_items as (
    select
      'ustalenie'::text as source_type,
      a.id as source_id,
      a.project_id,
      p.name as project_name,
      a.title,
      'CZEKA_NA_ZEWNETRZNE'::text as rot_status,
      'OCZEKIWANIE_DECYZJA_INWESTORA'::text as category,
      a.category::text as detail,
      coalesce(a.submitted_at, a.created_at) as opened_at,
      deadline.termin,
      a.stage_id,
      stage.title as stage_title,
      null::text as origin_stage_id,
      null::integer as move_count,
      null::text as origin_stage_title,
      null::text as carry_over_reason,
      inferred.stage_id as inferred_stage_id,
      inferred.stage_title as inferred_stage_title
    from project_client_agreements a
    join projects p on p.id = a.project_id
    left join lateral (
      select min((pp.milestone_dates ->> ms.id::text)::date) as termin
      from process_milestones ms
      join project_processes pp on pp.project_id = a.project_id
      where ms.stage_id::text = a.acceptance_deadline_stage_id
        and pp.milestone_dates ? ms.id::text
    ) deadline on true
    left join process_stages stage on stage.id::text = a.stage_id
    left join lateral (
      select h.stage_id, hs.title as stage_title
      from project_stage_history h
      left join process_stages hs on hs.id::text = h.stage_id
      where h.project_id = a.project_id
        and h.entered_at <= coalesce(a.submitted_at, a.created_at)
        and (h.exited_at is null or h.exited_at > coalesce(a.submitted_at, a.created_at))
      limit 1
    ) inferred on a.stage_id is null
    where a.status = 'pending_client'
  ),
  all_items as (
    select * from kanban_items
    union all select * from change_request_items
    union all select * from service_offer_items
    union all select * from agreement_items
  )
  select
    ai.source_type, ai.source_id, ai.project_id, ai.project_name, ai.title, ai.rot_status,
    ai.category, ai.detail, ai.opened_at,
    greatest(0, (now()::date - ai.opened_at::date))::integer as days_open,
    rr.review_date,
    ai.termin,
    ai.stage_id,
    ai.stage_title,
    ai.origin_stage_id,
    ai.move_count,
    coalesce(
      rr.review_date,
      case
        when ai.termin is not null then ai.termin - p_review_buffer_days
        when ai.rot_status = 'CZEKA_NA_ZEWNETRZNE' then ai.opened_at::date + p_review_waiting_client_days
        else ai.opened_at::date + p_review_default_interval_days
      end
    ) as effective_review_date,
    ai.origin_stage_title,
    ai.carry_over_reason,
    ai.inferred_stage_id,
    ai.inferred_stage_title
  from all_items ai
  left join rot_item_reviews rr on rr.source_type = ai.source_type and rr.source_id = ai.source_id
  where ai.rot_status is not null
  order by
    case ai.rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    coalesce(
      rr.review_date,
      case
        when ai.termin is not null then ai.termin - p_review_buffer_days
        when ai.rot_status = 'CZEKA_NA_ZEWNETRZNE' then ai.opened_at::date + p_review_waiting_client_days
        else ai.opened_at::date + p_review_default_interval_days
      end
    ) asc;
$function$;

comment on function public.report_rot_items is
  'ROT (D2/D9/D12/D13/D14/D30/D33/D44). stage_id/stage_title = etap WSKAZANY (kanban: live z '
  'tablicy; zmiana/ustalenie: stage_id, D44; oferta: zawsze null). inferred_stage_id/title = etap '
  'WYWNIOSKOWANY z project_stage_history (tylko zmiana/ustalenie BEZ stage_id) — zgadniecie, nie '
  'wskazanie, dlatego osobne pole, nigdy nie trafia do stage_id. origin_stage_id/title, move_count, '
  'carry_over_reason = przygotowanie pod 11c (przenoszenie miedzy etapami), tylko kanban.';

grant execute on function public.report_rot_items(integer, integer, integer) to authenticated;

-- Asercje ---------------------------------------------------------------------
do $$
declare
  v_rot_open integer;
  v_kanban_ze_stage integer;
  v_kanban_total integer;
  v_cr_agr_bez_stage integer;
  v_cr_agr_wywnioskowane integer;
  v_cr_agr_dalej_bez integer;
  v_oferty_z_wnioskiem integer;
begin
  select count(*) into v_rot_open from report_rot_items() where rot_status <> 'ZAMKNIETE';

  select count(*), count(*) filter (where stage_id is not null)
    into v_kanban_total, v_kanban_ze_stage
    from report_rot_items() where rot_status <> 'ZAMKNIETE' and source_type = 'kanban';
  if v_kanban_ze_stage <> v_kanban_total then
    raise exception 'Nie wszystkie karty kanban maja stage_id: % z %', v_kanban_ze_stage, v_kanban_total;
  end if;

  select count(*) into v_cr_agr_bez_stage
  from report_rot_items()
  where rot_status <> 'ZAMKNIETE' and source_type in ('zmiana_projektowa', 'ustalenie') and stage_id is null;

  select count(*) filter (where inferred_stage_id is not null),
         count(*) filter (where inferred_stage_id is null)
    into v_cr_agr_wywnioskowane, v_cr_agr_dalej_bez
    from report_rot_items()
    where rot_status <> 'ZAMKNIETE' and source_type in ('zmiana_projektowa', 'ustalenie') and stage_id is null;

  if v_cr_agr_wywnioskowane + v_cr_agr_dalej_bez <> v_cr_agr_bez_stage then
    raise exception 'Suma wywnioskowanych (%) i nadal bez (%) nie zgadza sie z bez stage_id (%)',
      v_cr_agr_wywnioskowane, v_cr_agr_dalej_bez, v_cr_agr_bez_stage;
  end if;

  -- Szybkie oferty NIGDY nie dostaja wnioskowania (brak zrodla) — jawne zabezpieczenie.
  select count(*) into v_oferty_z_wnioskiem
  from report_rot_items() where source_type = 'szybka_oferta' and inferred_stage_id is not null;
  if v_oferty_z_wnioskiem <> 0 then
    raise exception 'Szybkie oferty nie powinny miec inferred_stage_id, maja %', v_oferty_z_wnioskiem;
  end if;

  -- Wnioskowanie NIGDY nie nadpisuje jawnego stage_id — zabezpieczenie zasady z rozmowy.
  if exists (
    select 1 from report_rot_items()
    where stage_id is not null and inferred_stage_id is not null
  ) then
    raise exception 'Pozycja z jawnym stage_id nie powinna miec rownoczesnie inferred_stage_id — wnioskowanie nadpisuje wskazanie.';
  end if;

  raise notice 'OK: % otwartych pozycji, % kart kanban ze stage_id, % zmian/ustalen bez stage_id (% wywnioskowanych, % nadal bez pokrycia w historii etapow).',
    v_rot_open, v_kanban_ze_stage, v_cr_agr_bez_stage, v_cr_agr_wywnioskowane, v_cr_agr_dalej_bez;
end $$;
