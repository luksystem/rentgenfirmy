-- ROT: wymiar etapu — dziś nie da się zapytać "co jest otwarte na etapie 8" (zauważone w audycie:
-- report_rot_items() jest calosciowo projektowe, bez powiazania z active_stage_id). Brakujacy
-- element, bez ktorego brama 11c (przenoszenie pozycji miedzy etapami) nie ma czego pokazac do
-- decyzji. Cztery zrodla ROT, cztery rozne sposoby na etap:
--   - kanban: etap wynika Z TABLICY (element procesu -> szablon -> kamien -> etap), tak samo jak
--     juz istniejacy report_task_targets() (migracja 269) — ten sam lancuch joinow.
--   - zmiana projektowa / ustalenie: maja juz stage_id (D44, migracja 270) — dotad nigdzie nie
--     czytany. Miekkie odniesienie (text, bez FK), ten sam wzorzec co acceptance_deadline_stage_id
--     obok niego w tej samej funkcji.
--   - szybka oferta (services): brak jakiegokolwiek odniesienia do etapu w schemacie — zostaje bez
--     etapu. To swiadoma decyzja (rozmowa robocza), nie przeoczenie.
-- Pozycje bez etapu NIE sa filtrowane — UI pokazuje je jako "bez przypisania", nie ukrywa.

-- 1. Pole na PRZENIESIENIE (kanban) ------------------------------------------
-- Przygotowanie pod 11c, ktorego tu jeszcze nie budujemy: skad pozycja POCHODZI PIERWOTNIE i ile
-- razy zostala przeniesiona. origin_stage_id ustawiany raz, przy powstaniu karty (trigger, dziala
-- niezaleznie od tego, ktora sciezka aplikacji tworzy karte) i juz sie nie zmienia — to nie to samo
-- co biezacy etap (ten liczy sie live z tablicy, patrz kanban_items nizej). move_count zostaje na
-- 0 dla wszystkich, dopoki 11c nie doda mechanizmu przenoszenia, ktory bedzie go inkrementowal —
-- nie zmyslamy ruchu, ktorego jeszcze nie ma.
alter table public.process_kanban_tasks
  add column origin_stage_id text,
  add column move_count integer not null default 0;

comment on column public.process_kanban_tasks.origin_stage_id is
  'Etap, na ktorym karta ORYGINALNIE powstala (miekkie odniesienie, text, bez FK — ten sam wzorzec '
  'co project_change_requests.stage_id). Ustawiany raz przez trigger przy INSERT, niezmienny potem. '
  'Rozny od biezacego etapu (ten liczy sie live z tablicy/elementu procesu).';
comment on column public.process_kanban_tasks.move_count is
  'Ile razy karta zostala przeniesiona miedzy etapami — przygotowanie pod 11c (przenoszenie pozycji '
  'z warunkiem powrotu). Zawsze 0 dzis: mechanizm przenoszenia jeszcze nie istnieje, wiec nic go '
  'nie inkrementuje. Trzecie przeniesienie na tym samym warunku powrotu = nikt nie pilnuje tematu.';

create or replace function public.set_kanban_task_origin_stage()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origin_stage_id is not null then
    return new;
  end if;
  select s.id::text
  into new.origin_stage_id
  from process_kanban_columns c
  join process_kanban_boards b on b.id = c.board_id
  join project_process_items ppi on ppi.id = b.project_process_item_id
  left join process_items pi on pi.id = ppi.template_item_id
  left join process_milestones m on m.id = pi.milestone_id
  left join process_stages s on s.id = m.stage_id
  where c.id = new.column_id;
  return new;
end;
$$;

create trigger process_kanban_tasks_set_origin_stage
  before insert on public.process_kanban_tasks
  for each row execute function public.set_kanban_task_origin_stage();

-- Backfill: karty juz istniejace nie miaty jeszcze zadnego ruchu, wiec ich biezacy etap = etap
-- pierwotny. Ten sam lancuch joinow co trigger powyzej.
update public.process_kanban_tasks t
set origin_stage_id = s.id::text
from process_kanban_columns c
join process_kanban_boards b on b.id = c.board_id
join project_process_items ppi on ppi.id = b.project_process_item_id
left join process_items pi on pi.id = ppi.template_item_id
left join process_milestones m on m.id = pi.milestone_id
left join process_stages s on s.id = m.stage_id
where t.column_id = c.id
  and t.origin_stage_id is null;

-- 2. report_rot_items(): dodanie wymiaru etapu (stage_id/stage_title) + pol PRZENIESIENIA
-- (origin_stage_id/move_count, tylko kanban — pozostale zrodla nie maja pojecia "przeniesienia").
-- DROP wymagany, bo CREATE OR REPLACE nie pozwala zmienic ksztaltu RETURNS TABLE.
drop function public.report_rot_items();

create function public.report_rot_items()
returns table(
  source_type text, source_id uuid, project_id uuid, project_name text, title text, rot_status text,
  category text, detail text, opened_at timestamp with time zone, days_open integer, review_date date,
  termin date, stage_id text, stage_title text, origin_stage_id text, move_count integer
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
      t.move_count
    from process_kanban_tasks t
    join process_kanban_columns c on c.id = t.column_id
    join process_kanban_boards b on b.id = c.board_id
    join project_process_items ppi on ppi.id = b.project_process_item_id
    join projects p on p.id = ppi.project_id
    left join process_items pi on pi.id = ppi.template_item_id
    left join process_milestones m on m.id = pi.milestone_id
    left join process_stages s on s.id = m.stage_id
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
      null::integer as move_count
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
      null::integer as move_count
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
      null::integer
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
      null::integer as move_count
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
    ai.move_count
  from all_items ai
  left join rot_item_reviews rr on rr.source_type = ai.source_type and rr.source_id = ai.source_id
  where ai.rot_status is not null
  order by
    case ai.rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    ai.opened_at asc;
$function$;

comment on function public.report_rot_items is
  'ROT (D2/D9/D12/D13/D14/D30/D33/D44). stage_id/stage_title = wymiar etapu, per zrodlo: kanban '
  '(live z tablicy/elementu procesu), zmiana projektowa/ustalenie (stage_id, D44), szybka oferta '
  '(zawsze null — brak odniesienia w schemacie, swiadomie). origin_stage_id/move_count = przygotowanie '
  'pod 11c (przenoszenie pozycji miedzy etapami), tylko kanban. Pozycje bez etapu NIE sa filtrowane.';

grant execute on function public.report_rot_items() to authenticated;

-- Asercje ---------------------------------------------------------------------
do $$
declare
  v_kanban_total integer;
  v_kanban_origin integer;
  v_rot_rows integer;
  v_rot_kanban_stage integer;
  v_rot_cr_stage integer;
  v_rot_offer_stage integer;
  v_move_count_nonzero integer;
begin
  select count(*), count(*) filter (where origin_stage_id is not null)
    into v_kanban_total, v_kanban_origin
    from process_kanban_tasks;

  if v_kanban_total <> 153 then
    raise exception 'Zmienila sie liczba kart kanban: oczekiwano 153, jest %', v_kanban_total;
  end if;
  if v_kanban_origin <> v_kanban_total then
    raise exception 'Backfill origin_stage_id niepelny: % z % kart', v_kanban_origin, v_kanban_total;
  end if;

  select count(*) into v_move_count_nonzero from process_kanban_tasks where move_count <> 0;
  if v_move_count_nonzero <> 0 then
    raise exception 'move_count powinien byc wszedzie 0 (mechanizm przenoszenia jeszcze nie istnieje), jest % niezerowych', v_move_count_nonzero;
  end if;

  select count(*) into v_rot_rows from report_rot_items();
  if v_rot_rows <> 131 then
    raise exception 'Zmienila sie liczba pozycji ROT: oczekiwano 131, jest %', v_rot_rows;
  end if;

  select count(*) filter (where source_type = 'kanban' and stage_id is not null),
         count(*) filter (where source_type in ('zmiana_projektowa', 'ustalenie') and stage_id is not null),
         count(*) filter (where source_type = 'szybka_oferta' and stage_id is not null)
    into v_rot_kanban_stage, v_rot_cr_stage, v_rot_offer_stage
    from report_rot_items();

  -- Kazda pozycja kanbanowa w ROT musi miec etap — inaczej lancuch joinow (ten sam co
  -- report_task_targets) cos gubi.
  if v_rot_kanban_stage <> (select count(*) from report_rot_items() where source_type = 'kanban') then
    raise exception 'Nie wszystkie pozycje kanban w ROT maja stage_id: % z %',
      v_rot_kanban_stage, (select count(*) from report_rot_items() where source_type = 'kanban');
  end if;
  -- Szybkie oferty swiadomie NIGDY nie maja etapu.
  if v_rot_offer_stage <> 0 then
    raise exception 'Szybkie oferty nie powinny miec stage_id, ma go %', v_rot_offer_stage;
  end if;
  -- Zmiany/ustalenia: dzis tylko garstka ma stage_id (sciezka zgloszenia pracowniczego, D44) —
  -- reszta zostaje bez przypisania i to jest w porzadku, ale mechanizm musi dzialac na choc jednej.
  if v_rot_cr_stage = 0 then
    raise exception 'Zadna zmiana/ustalenie w ROT nie ma stage_id — polaczenie z D44 nie dziala.';
  end if;

  raise notice 'OK: % kart kanban z origin_stage_id, % pozycji ROT (% kanban ze stage_id, % zmian/ustalen ze stage_id, oferty=0).',
    v_kanban_origin, v_rot_rows, v_rot_kanban_stage, v_rot_cr_stage;
end $$;
