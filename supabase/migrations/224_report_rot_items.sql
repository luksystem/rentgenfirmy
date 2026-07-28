-- Faza 4 (ROT jako widok) - docs/08 D2/D9/D12/D13/D14 (kanban/zmiany/szybkie oferty) + czwarte
-- zrodlo uzgodnione w rozmowie roboczej: project_client_agreements (Ustalenia), wylacznie
-- status='pending_client'. Zwraca WSZYSTKIE statusy (w tym ZAMKNIETE) - to rejestr, nie tylko
-- lista otwartych; UI domyslnie eksponuje CZEKA_NA_ZEWNETRZNE/W_TOKU, ZAMKNIETE zwija.
--
-- Kanban: karta liczy sie do ROT tylko gdy closed_at is null (closeKanbanTask() to juz istniejacy,
-- niezalezny sygnal "zrobione" - uzywany dzis w countOpenKanbanTasks/countOverdueKanbanTasks; ROT
-- go respektuje zamiast wymyslac drugi, zeby "jedna informacja mialo jedno miejsce") ORAZ kolumna
-- ma skonfigurowany rot_status (migracja 223) - karta w niezmapowanej kolumnie swiadomie nie
-- wchodzi do ROT.
create or replace function public.report_rot_items()
returns table (
  source_type text,
  source_id uuid,
  project_id uuid,
  project_name text,
  title text,
  rot_status text,
  category text,
  detail text,
  opened_at timestamptz,
  days_open integer
)
language sql
stable
set search_path = public
as $$
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
      t.created_at as opened_at
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
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
        when 'cancelled' then 'ZAMKNIETE'
      end as rot_status,
      case cr.status
        when 'pending_client' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Zmiana projektowa'::text as detail,
      coalesce(cr.submitted_at, cr.created_at) as opened_at
    from project_change_requests cr
    join projects p on p.id = cr.project_id
    where cr.status in ('pending_client', 'accepted', 'rejected', 'cancelled')
  ),
  service_offer_items as (
    select
      'szybka_oferta'::text as source_type,
      s.id as source_id,
      s.project_id,
      p.name as project_name,
      s.title,
      case s.client_offer_status
        when 'pending' then 'CZEKA_NA_ZEWNETRZNE'
        when 'negotiation' then 'W_TOKU'
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
      end as rot_status,
      case s.client_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end as category,
      'Oferta'::text as detail,
      coalesce(s.client_offer_responded_at, s.created_at) as opened_at
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
        when 'accepted' then 'W_TOKU'
        when 'rejected' then 'ZAMKNIETE'
      end,
      case s.settlement_offer_status
        when 'pending' then 'OCZEKIWANIE_DECYZJA_INWESTORA'
        when 'rejected' then 'POZA_ZAKRESEM'
        else null
      end,
      'Rozliczenie'::text,
      coalesce(s.settlement_offer_responded_at, s.created_at)
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
      coalesce(a.submitted_at, a.created_at) as opened_at
    from project_client_agreements a
    join projects p on p.id = a.project_id
    where a.status = 'pending_client'
  ),
  all_items as (
    select * from kanban_items
    union all select * from change_request_items
    union all select * from service_offer_items
    union all select * from agreement_items
  )
  select
    source_type, source_id, project_id, project_name, title, rot_status, category, detail, opened_at,
    greatest(0, (now()::date - opened_at::date))::integer as days_open
  from all_items
  where rot_status is not null
  order by
    case rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    opened_at asc;
$$;

comment on function public.report_rot_items is
  'ROT (Rejestr Otwartych Tematow, docs/08 D2/D9/D12/D13/D14) jako widok z czterech zrodel: kanban '
  '(karta bez closed_at, kolumna z rot_status), project_change_requests, szybkie oferty (services '
  'Prace dodatkowe, oferta i rozliczenie osobno), project_client_agreements (wylacznie '
  'pending_client). Zwraca wszystkie statusy w tym ZAMKNIETE - to rejestr, nie tylko lista otwartych.';

grant execute on function public.report_rot_items() to authenticated;
