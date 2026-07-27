-- Test gotowości projektu (docs/09, sekcja "Test gotowości projektu") jako funkcja SQL,
-- analogiczna do report_orphaned_stage_references. Uruchamialna z SQL Editora, bez UI.
--
-- ZASADA: pozycja, której pole jeszcze nie istnieje w schemacie, zwraca 'niedostępne',
-- NIGDY 'nie_spełnione' — inaczej raport kłamie (pokazuje brak jako świadomy stan zamiast
-- jako lukę w narzędziu). Dziś checkable są 3 z 8 pozycji: etap aktualny, sloty obsadzone,
-- lider etapu. Pozostałe 5 (profil klienta, kanał komunikacji, ROT, podmioty "kto zatrudnia",
-- data ostatniego kontaktu) nie mają dziś pola do sprawdzenia — patrz komentarze przy każdej.

create or replace function public.report_project_readiness()
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
  data_ostatniego_kontaktu text
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
  )
  select
    p.id,
    p.name,
    p.flow_status,
    -- 1. etap aktualny: CHECKABLE (project_stage_history, faza 1) — sprawdza tylko, czy
    --    istnieje otwarty wiersz historii, NIE sprawdza "zgodności ze stanem faktycznym"
    --    (to wymaga człowieka, żadne query tego nie zweryfikuje).
    case when os.project_id is not null then 'spełnione' else 'nie_spełnione' end,
    -- 2. sloty obsadzone: CHECKABLE (project_role_slot, faza 2) — fallback też liczy się
    --    jako "jawnie oznaczona luka", zgodnie z zasadą widocznego oznaczenia fallbacku.
    case when rc.all_covered then 'spełnione' else 'nie_spełnione' end,
    -- 3. profil klienta: NIEDOSTĘPNE — client_profile (04 §4.1) nie istnieje.
    'niedostępne',
    -- 4. kanał komunikacji z numerem: NIEDOSTĘPNE — istnieje wyłącznie surowy clients.phone,
    --    ale "ustalony kanał komunikacji" (04 §11 krok 4) jako jawna decyzja nie istnieje.
    --    Podstawienie clients.phone pod to pytanie odpowiadałoby na INNE pytanie.
    'niedostępne',
    -- 5. ROT z właścicielem i datą kontroli: NIEDOSTĘPNE — ROT nie istnieje.
    'niedostępne',
    -- 6. podmioty zewnętrzne z "kto zatrudnia": NIEDOSTĘPNE — project_trades ma podmioty
    --    i kontakty, ale nie ma pola "kto zatrudnia". Połowa pytania jest sprawdzalna,
    --    połowa nie — całość musi być 'niedostępne', żeby nie zafałszować.
    'niedostępne',
    -- 7. lider etapu: CHECKABLE (project_stage_leads + requires_project_stage_lead, faza 1).
    --    Brak otwartego etapu -> traktowane jako nie_spełnione (nie da się potwierdzić lidera
    --    dla niezdefiniowanego etapu), nie jako niedostępne — pole istnieje, brakuje danych.
    case
      when lc.lead_ok is null then 'nie_spełnione'
      when lc.lead_ok then 'spełnione'
      else 'nie_spełnione'
    end,
    -- 8. data ostatniego kontaktu: NIEDOSTĘPNE mimo że kolumna last_contact_date istnieje —
    --    D18/D19 ustaliły, że jest zamrożona od utworzenia projektu i nigdy nieaktualizowana.
    --    Zwrócenie 'spełnione' na podstawie samego NOT NULL byłoby fałszywym pozytywem
    --    dokładnie tego typu, przed którym ostrzega zadanie.
    'niedostępne'
  from public.projects p
  left join open_stage os on os.project_id = p.id
  left join role_coverage rc on rc.project_id = p.id
  left join lead_check lc on lc.project_id = p.id
  order by p.name;
$$;

comment on function public.report_project_readiness is
  'Test gotowości projektu (docs/09) jako zapytanie. 3 z 8 pozycji checkable dziś (etap aktualny, '
  'sloty obsadzone, lider etapu) — reszta zwraca zawsze ''niedostępne'', bo pola jeszcze nie '
  'istnieją. Nie włączać alertów na tej podstawie, dopóki nie ma się 8/8 checkable.';

grant execute on function public.report_project_readiness() to authenticated;
