-- ROT: client_offer_status='accepted' zostawal W_TOKU na zawsze, nawet gdy usluga dawno przeszla
-- do fazy rozliczenia/fakturowania (zgloszenie wlasciciela: oferta Nieszporski "Montaz dodatkowych
-- AccessPointow", client_offer_status='accepted' z 2026-06-23, ale service.status juz 'Rozliczony').
--
-- Ten sam typ bledu co D30 (accepted = stan koncowy tego konkretnego watku, nie caly czas w toku),
-- ale subtelniejszy: w przeciwienstwie do zmiany projektowej (gdzie status faktycznie nigdy sie juz
-- nie zmienia), tu WLASNIE service.status idzie dalej (Zaplanowany -> W trakcie -> Do rozliczenia ->
-- Rozliczony -> Rozliczanie -> Fakturowanie -> Zakonczona), a client_offer_status zamraza sie na
-- 'accepted' na zawsze (jego jedyna rola to zgoda na zakres, zeby ruszyc prace - nie sledzi dalszego
-- zycia uslugi). ROT mylil te dwie rzeczy: "klient zaakceptowal zakres" != "praca wciaz trwa".
--
-- Naprawa: accepted zostaje W_TOKU tylko, dopoki usluga jest jeszcze faktycznie w realizacji
-- (Zaplanowany/W trakcie). Gdy usluga przeszla do fazy rozliczenia/fakturowania/zamkniecia, watek
-- akceptacji oferty jest juz historia - zamykamy.
create or replace function public.report_rot_items()
 returns table(source_type text, source_id uuid, project_id uuid, project_name text, title text, rot_status text, category text, detail text, opened_at timestamp with time zone, days_open integer, review_date date, termin date)
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
      null::text as category,
      c.title as detail,
      t.created_at as opened_at,
      null::date as termin
    from process_kanban_tasks t
    join process_kanban_columns c on c.id = t.column_id
    join process_kanban_boards b on b.id = c.board_id
    join project_process_items ppi on ppi.id = b.project_process_item_id
    join projects p on p.id = ppi.project_id
    where t.closed_at is null
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
      deadline.termin
    from project_change_requests cr
    join projects p on p.id = cr.project_id
    left join lateral (
      select min((pp.milestone_dates ->> ms.id::text)::date) as termin
      from process_milestones ms
      join project_processes pp on pp.project_id = cr.project_id
      where ms.stage_id::text = cr.acceptance_deadline_stage_id
        and pp.milestone_dates ? ms.id::text
    ) deadline on true
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
      case when s.client_offer_status = 'pending' then s.client_offer_expires_at::date else null end as termin
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
      case when s.settlement_offer_status = 'pending' then s.settlement_offer_expires_at::date else null end
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
      deadline.termin
    from project_client_agreements a
    join projects p on p.id = a.project_id
    left join lateral (
      select min((pp.milestone_dates ->> ms.id::text)::date) as termin
      from process_milestones ms
      join project_processes pp on pp.project_id = a.project_id
      where ms.stage_id::text = a.acceptance_deadline_stage_id
        and pp.milestone_dates ? ms.id::text
    ) deadline on true
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
    ai.termin
  from all_items ai
  left join rot_item_reviews rr on rr.source_type = ai.source_type and rr.source_id = ai.source_id
  where ai.rot_status is not null
  order by
    case ai.rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    ai.opened_at asc;
$function$;

comment on function public.report_rot_items() is
  'ROT (D2/D9/D12/D13/D14/D30/D33/D34). client_offer_status=accepted jest ZAMKNIETE gdy usluga '
  'przeszla do fazy rozliczenia/fakturowania/zamkniecia (D34) - accepted samo w sobie nie znaczy '
  '"wciaz w toku", tylko "zakres zaakceptowany".';
