-- ROT status-mapping fix (zgloszone przez wlasciciela): 'accepted' bywa stanem KONCOWYM obiektu
-- (nic wiecej sie z nim nie stanie), a nie sygnalem "w toku". report_rot_items() traktowal oba
-- przypadki identycznie z faktycznie wciaz-trwajacym 'accepted'. Dwa realne przypadki:
--
-- 1) settlement_offer_status='accepted' -> usluga idzie do "Fakturowanie" (serviceStatusAfterSettlementAction,
--    lib/service/settlement-offer.ts) - rozliczenie zaakceptowane, nic po stronie inwestora juz nie czeka.
--    (client_offer_status='accepted' zostaje W_TOKU - tam usluga dopiero idzie do "Zaplanowany", praca
--    przed nami, to faktycznie w toku.)
--
-- 2) project_change_requests.status='accepted' - to jest TERMINALNY stan calego obiektu (status nigdy
--    zmienia sie z 'accepted' na nic innego - project-change-request-repository.ts ma tylko przejscia
--    draft->pending_client->(accepted|rejected|cancelled)). Modul sluzy wylacznie do zebrania decyzji
--    klienta przed etapem (blocksNextStage) - po akceptacji nie ma juz zadnego otwartego tematu.
--    Potwierdzone na produkcji: projekt Zimnowlodzki, 12 zaakceptowanych zmian wiszacych w ROT bez ruchu.
create or replace function public.report_rot_items()
 returns table(source_type text, source_id uuid, project_id uuid, project_name text, title text, rot_status text, category text, detail text, opened_at timestamp with time zone, days_open integer, review_date date)
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
        when 'accepted' then 'ZAMKNIETE'
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
    ai.source_type, ai.source_id, ai.project_id, ai.project_name, ai.title, ai.rot_status,
    ai.category, ai.detail, ai.opened_at,
    greatest(0, (now()::date - ai.opened_at::date))::integer as days_open,
    rr.review_date
  from all_items ai
  left join rot_item_reviews rr on rr.source_type = ai.source_type and rr.source_id = ai.source_id
  where ai.rot_status is not null
  order by
    case ai.rot_status when 'CZEKA_NA_ZEWNETRZNE' then 0 when 'W_TOKU' then 1 else 2 end,
    ai.opened_at asc;
$function$;

comment on function public.report_rot_items() is
  'ROT (D2/D9/D12/D13/D14). accepted = stan koncowy obiektu -> ZAMKNIETE dla zmian projektowych '
  '(status nigdy nie zmienia sie z accepted dalej) i rozliczen (usluga idzie do Fakturowania, nic '
  'juz nie czeka po stronie inwestora). client_offer accepted zostaje W_TOKU - usluga dopiero idzie '
  'do wykonania.';
