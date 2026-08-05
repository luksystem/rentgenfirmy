-- ROT: data kontroli efektywna (review_date ?? sugerowana) jako JEDNO miejsce prawdy w SQL,
-- zamiast SQL-fakty + TS-decyzja (lib/rot/review-date.ts::computeSuggestedReviewDate). Powod
-- odejscia od wczesniejszego podzialu (migracja 253): report_project_readiness() potrzebuje TEJ
-- SAMEJ decyzji ("czy ktoras pozycja jest po dacie kontroli") jako agregatu SQL, uruchamialnego
-- bez UI (docs/09) — duplikowanie trojgalezionej logiki w dwoch miejscach (SQL agregat + TS widok)
-- jest wlasnie tym wzorcem "mechanizm wyglada na dzialajacy, a nie dziala", ktory mielismy naprawic.
-- Progi (bufor/oczekiwanie/interwal) NIE sa czytane z app_settings w SQL — ida jako PARAMETRY z
-- domyslnymi wartosciami (ten sam wzorzec co report_stage_commitments(p_horizon_days default 21)),
-- warstwa TS (fetchPolicyThresholds) nadal jest jedynym miejscem, ktore CZYTA konfiguracje.
--
-- Nie zapisujemy sugerowanej do rot_item_reviews (decyzja wlasciciela): przeliczana na zywo jest
-- zawsze aktualna, zapisana zamarzalaby przy przesunieciu terminu (ten sam problem co
-- last_contact_date). review_date pozostaje WYLACZNIE recznym sladem "ktos to przejrzal" - automat
-- nigdy go nie ustawia, bo to zniszczyloby jedyna wartosc tego pola.

-- 1. report_rot_items(): + effective_review_date (review_date ?? formula), sortowanie po niej
--    (najbardziej zaległe/najbliższe pierwsze) zamiast po opened_at.
drop function public.report_rot_items();

create function public.report_rot_items(
  p_review_buffer_days integer default 3,
  p_review_waiting_client_days integer default 7,
  p_review_default_interval_days integer default 14
)
returns table(
  source_type text, source_id uuid, project_id uuid, project_name text, title text, rot_status text,
  category text, detail text, opened_at timestamp with time zone, days_open integer, review_date date,
  termin date, stage_id text, stage_title text, origin_stage_id text, move_count integer,
  effective_review_date date
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
    ai.move_count,
    coalesce(
      rr.review_date,
      case
        when ai.termin is not null then ai.termin - p_review_buffer_days
        when ai.rot_status = 'CZEKA_NA_ZEWNETRZNE' then ai.opened_at::date + p_review_waiting_client_days
        else ai.opened_at::date + p_review_default_interval_days
      end
    ) as effective_review_date
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
  'ROT (D2/D9/D12/D13/D14/D30/D33/D44). effective_review_date = review_date ?? formula '
  '(termin-bufor / otwarcie+oczekiwanie / otwarcie+interwal, progi jako PARAMETRY, nie czytane z '
  'app_settings tutaj) — JEDNO miejsce liczenia, uzywane przez UI (sortowanie/sekcje/filtr) i przez '
  'report_project_readiness (agregat "czy ktos zalega"). review_date NIGDY nie jest ustawiany '
  'automatycznie — zostaje wylacznie recznym sladem przegladu.';

grant execute on function public.report_rot_items(integer, integer, integer) to authenticated;

-- 2. report_project_readiness(): pozycja "ROT" mierzy teraz ZALEGLOSC (ktos jest po dacie kontroli),
--    nie AKTYWNOSC (ktos kliknal). Dodatkowa kolumna z liczba zaleglych pozycji.
drop function public.report_project_readiness();

create function public.report_project_readiness(
  p_review_buffer_days integer default 3,
  p_review_waiting_client_days integer default 7,
  p_review_default_interval_days integer default 14
)
returns table (
  project_id uuid,
  project_name text,
  flow_status text,
  etap_aktualny text,
  sloty_obsadzone text,
  profil_klienta text,
  kanal_komunikacji text,
  rot_przeniesione_z_wlascicielem_i_data_kontroli text,
  podmioty_zewnetrzne_kto_zatrudnia text,
  lider_etapu text,
  data_ostatniego_kontaktu text,
  rot_pozycji_po_terminie integer
)
language sql
stable
set search_path = public
as $$
  with required_roles as (
    select unnest(array[
      'wlasciciel', 'opiekun_projektu', 'koordynator_operacyjny',
      'koordynator_techniczny', 'projektant', 'wdrozeniowiec'
    ]) as role_code
  ),
  role_coverage as (
    select p.id as project_id,
      bool_and(exists (
        select 1 from public.project_role_slot prs
        where prs.project_id = p.id and prs.role_code = rr.role_code and prs.to_date is null
      )) as all_covered
    from public.projects p cross join required_roles rr
    group by p.id
  ),
  open_stage as (
    select project_id, stage_id from public.project_stage_history where exited_at is null
  ),
  stage_req as (
    select os.project_id, os.stage_id, coalesce(ps.requires_project_stage_lead, false) as requires_lead
    from open_stage os
    left join public.process_stages ps on ps.id::text = os.stage_id
  ),
  lead_check as (
    select sr.project_id,
      case
        when not sr.requires_lead then true
        when exists (
          select 1 from public.project_stage_leads psl
          where psl.project_id = sr.project_id and psl.stage_id = sr.stage_id
        ) then true
        else false
      end as lead_ok
    from stage_req sr
  ),
  -- Pozycja 5: ROT — MIERZY ZALEGLOSC, nie aktywnosc. Wczesniejsza wersja (migracja 307) wymagala,
  -- zeby KTOS recznie kliknal na kazdej otwartej pozycji, co wymuszalo klikanie dla samego
  -- klikania. Teraz: czy ktoras otwarta pozycja ma effective_review_date (review_date ?? formula)
  -- w przeszlosci wzgledem dzis.
  rot_open as (
    select * from public.report_rot_items(p_review_buffer_days, p_review_waiting_client_days, p_review_default_interval_days)
    where rot_status <> 'ZAMKNIETE'
  ),
  rot_coverage as (
    select p.id as project_id,
      count(ro.source_id) filter (where ro.effective_review_date < current_date) as overdue_count
    from public.projects p
    left join rot_open ro on ro.project_id = p.id
    group by p.id
  ),
  -- Pozycja 8: istnienie choc jednego wiersza w communication_events — sama egzystencja, nie
  -- "swiezosc" (ten sam standard co etap_aktualny).
  contact_coverage as (
    select p.id as project_id,
      exists (select 1 from public.communication_events ce where ce.project_id = p.id) as has_contact
    from public.projects p
  )
  select
    p.id,
    p.name,
    p.flow_status,
    -- 1. etap aktualny: CHECKABLE (project_stage_history, faza 1).
    case when os.project_id is not null then 'spełnione' else 'nie_spełnione' end,
    -- 2. sloty obsadzone: CHECKABLE (project_role_slot, faza 2).
    case when rc.all_covered then 'spełnione' else 'nie_spełnione' end,
    -- 3. profil klienta: NIEDOSTĘPNE — client_profile (04 §4.1) nie istnieje. Bez zmian.
    'niedostępne',
    -- 4. kanał komunikacji z numerem: NIEDOSTĘPNE — jawna decyzja "ustalony kanał" nie istnieje.
    'niedostępne',
    -- 5. ROT: spełnione = zero otwartych pozycji po dacie kontroli (efektywnej).
    case when coalesce(rotc.overdue_count, 0) = 0 then 'spełnione' else 'nie_spełnione' end,
    -- 6. podmioty zewnętrzne z "kto zatrudnia": NIEDOSTĘPNE — pole istnieje (hired_by), ale w
    --    praktyce puste (4/400) — robota ręczna, nie luka kodowa.
    'niedostępne',
    -- 7. lider etapu: CHECKABLE (project_stage_leads + requires_project_stage_lead, faza 1).
    case
      when lc.lead_ok is null then 'nie_spełnione'
      when lc.lead_ok then 'spełnione'
      else 'nie_spełnione'
    end,
    -- 8. data ostatniego kontaktu: CHECKABLE (communication_events, Faza 9A).
    case when cc.has_contact then 'spełnione' else 'nie_spełnione' end,
    -- Liczba zaległych pozycji ROT — surowy fakt do wglądu, niezależnie od statusu spełnione/nie.
    coalesce(rotc.overdue_count, 0)::integer
  from public.projects p
  left join open_stage os on os.project_id = p.id
  left join role_coverage rc on rc.project_id = p.id
  left join lead_check lc on lc.project_id = p.id
  left join rot_coverage rotc on rotc.project_id = p.id
  left join contact_coverage cc on cc.project_id = p.id
  order by p.name;
$$;

comment on function public.report_project_readiness is
  'Test gotowości projektu (docs/09). 5 z 8 pozycji checkable (etap aktualny, sloty obsadzone, '
  'lider etapu, ROT bez zaległości, data ostatniego kontaktu) — 3 zostają ''niedostępne'' (profil '
  'klienta, kanał komunikacji jako decyzja, "kto zatrudnia" — pole istnieje, w praktyce puste). '
  'ROT mierzy ZALEGŁOŚĆ (effective_review_date w przeszłości), nie aktywność (ktoś kliknął) — '
  'poprawka po migracji 307, która wymuszała klikanie dla samego klikania.';

grant execute on function public.report_project_readiness(integer, integer, integer) to authenticated;

-- Asercje ---------------------------------------------------------------------
do $$
declare
  v_total integer;
  v_rot_open integer;
  v_rot_overdue_items integer;
  v_rot_ok_projects integer;
  v_contact_ok integer;
  v_max_days_open integer;
  v_max_overdue_days integer;
begin
  select count(*) into v_total from projects;
  if v_total <> 177 then
    raise exception 'Zmienila sie liczba projektow: oczekiwano 177, jest %', v_total;
  end if;

  select count(*) into v_rot_open from report_rot_items() where rot_status <> 'ZAMKNIETE';
  if v_rot_open <> 107 then
    raise exception 'Zmienila sie liczba otwartych pozycji ROT: oczekiwano 107, jest %', v_rot_open;
  end if;

  select count(*) into v_rot_overdue_items
  from report_rot_items() where rot_status <> 'ZAMKNIETE' and effective_review_date < current_date;

  select count(*) filter (where rot_przeniesione_z_wlascicielem_i_data_kontroli = 'spełnione'),
         count(*) filter (where data_ostatniego_kontaktu = 'spełnione')
    into v_rot_ok_projects, v_contact_ok
    from report_project_readiness();

  if v_contact_ok <> 6 then
    raise exception 'Oczekiwano 6 projektow z kontaktem spelnionym, jest %', v_contact_ok;
  end if;

  -- Konsystencja: suma zaleglych pozycji po projektach musi rownac sie globalnej liczbie zaleglych.
  if (select coalesce(sum(rot_pozycji_po_terminie), 0) from report_project_readiness()) <> v_rot_overdue_items then
    raise exception 'Suma zaleglych z report_project_readiness (%) nie zgadza sie z globalna liczba (%)',
      (select sum(rot_pozycji_po_terminie) from report_project_readiness()), v_rot_overdue_items;
  end if;

  -- Zadna pozycja bez terminu (formula) nie jest dziś dalej niz 30 dni po sugerowanej dacie —
  -- konsekwencja "opened_at + interwal" (nie "dzis + interwal") jest dzis lagodna, nie wielomiesieczna.
  select max(current_date - effective_review_date) into v_max_overdue_days
  from report_rot_items()
  where rot_status <> 'ZAMKNIETE' and review_date is null and effective_review_date < current_date;
  if v_max_overdue_days is not null and v_max_overdue_days > 30 then
    raise exception 'Sugerowana data kontroli jest ponad 30 dni w przeszlosci dla co najmniej jednej pozycji (%) - sprawdz regule "opened_at + interwal"', v_max_overdue_days;
  end if;

  select max(days_open) into v_max_days_open from report_rot_items() where rot_status <> 'ZAMKNIETE';

  raise notice 'OK: % otwartych pozycji ROT, % zaleglych (max % dni po sugerowanej dacie, max % dni otwarcia), % projektow z kontaktem.',
    v_rot_open, v_rot_overdue_items, coalesce(v_max_overdue_days, 0), v_max_days_open, v_contact_ok;
end $$;
