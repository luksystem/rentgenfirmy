-- Domkniecie dwoch z pieciu "niedostepnych" pozycji w report_project_readiness() (migracja 219).
-- Dane juz istnialy niezaleznie od tej funkcji — to byla zaleglosc w funkcji, nie brak danych:
--   - ROT z wlascicielem i data kontroli: report_rot_items() (Faza 4) + rot_item_reviews.review_date
--     (Faza 7) juz dzialaly, funkcja po prostu nigdy nie zostala zaktualizowana, zeby to sprawdzic.
--   - data ostatniego kontaktu: communication_events.event_at (Faza 9A, migracja 258) jest ZYWYM
--     zrodlem — w odroznieniu od projects.last_contact_date (D18/D19: zamrozone od utworzenia
--     projektu), aktualizuje sie przy kazdym zalogowanym kontakcie.
--
-- Trzy pozostale pozycje ZOSTAJA 'niedostepne' (bez zmian): profil klienta i kanal komunikacji jako
-- jawna decyzja nie istnieja w schemacie; project_trades.hired_by istnieje, ale jest puste w 396/400
-- wierszy — to robota reczna do wypelnienia, nie luka kodowa do zalatania.
--
-- Wzorzec sprawdzenia "spelnione" (identyczny dla obu pozycji, ten sam co role_coverage/sloty
-- obsadzone nizej): PROJEKT przechodzi, gdy NIE ISTNIEJE zadna otwarta pozycja/warunek, ktory by go
-- zawodzil — projekt bez zadnych otwartych pozycji ROT przechodzi automatycznie (nie ma czego
-- przegapic), tak samo jak "sloty obsadzone" nie wymaga slotow, ktorych rola nie potrzebuje.
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
  ),
  -- Pozycja 5 (byla NIEDOSTEPNE): otwarte pozycje ROT (report_rot_items(), Faza 4) musza miec
  -- review_date (rot_item_reviews, Faza 7) USTAWIONY PRZEZ WLASCICIELA TEGO PROJEKTU
  -- (project_role_slot.role_code='wlasciciel', to_date is null) — "z wlascicielem" to nie "przez
  -- kogokolwiek z dostepem do ROT", to konkretnie osoba w tej roli w tym projekcie.
  rot_open as (
    select * from public.report_rot_items() where rot_status <> 'ZAMKNIETE'
  ),
  rot_coverage as (
    select p.id as project_id,
      not exists (
        select 1 from rot_open ro
        where ro.project_id = p.id
          and not exists (
            select 1 from public.rot_item_reviews rr
            join public.project_role_slot prs
              on prs.project_id = p.id and prs.role_code = 'wlasciciel' and prs.to_date is null
            where rr.source_type = ro.source_type and rr.source_id = ro.source_id
              and rr.review_date is not null
              and rr.set_by = prs.user_id
          )
      ) as rot_ok
    from public.projects p
  ),
  -- Pozycja 8 (byla NIEDOSTEPNE): istnienie choc jednego wiersza w communication_events — sama
  -- egzystencja, nie "swiezosc" (ten sam standard co etap_aktualny: sprawdzamy, czy pole ma
  -- wartosc, nie czy wartosc jest "dobra" — to ocena czlowieka, nie zapytanie).
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
    -- 4. kanał komunikacji z numerem: NIEDOSTĘPNE — "ustalony kanał komunikacji" (04 §11 krok 4)
    --    jako jawna decyzja nie istnieje (jest tylko surowe clients.phone i channel PER ZDARZENIE
    --    w communication_events, nie decyzja "ten kanał obowiązuje ten projekt"). Bez zmian.
    'niedostępne',
    -- 5. ROT z właścicielem i datą kontroli: TERAZ CHECKABLE (patrz rot_coverage wyżej).
    case when rotc.rot_ok then 'spełnione' else 'nie_spełnione' end,
    -- 6. podmioty zewnętrzne z "kto zatrudnia": NIEDOSTĘPNE — project_trades.hired_by istnieje
    --    (migracja 225), ale to robota ręczna do wypełnienia (4/400 wierszy), nie luka kodowa.
    --    Zwrócenie 'nie_spełnione' na podstawie samego "pole puste" fałszywie sugerowałoby, że to
    --    coś do naprawienia w kodzie — a to nie jest.
    'niedostępne',
    -- 7. lider etapu: CHECKABLE (project_stage_leads + requires_project_stage_lead, faza 1).
    case
      when lc.lead_ok is null then 'nie_spełnione'
      when lc.lead_ok then 'spełnione'
      else 'nie_spełnione'
    end,
    -- 8. data ostatniego kontaktu: TERAZ CHECKABLE (patrz contact_coverage wyżej).
    case when cc.has_contact then 'spełnione' else 'nie_spełnione' end
  from public.projects p
  left join open_stage os on os.project_id = p.id
  left join role_coverage rc on rc.project_id = p.id
  left join lead_check lc on lc.project_id = p.id
  left join rot_coverage rotc on rotc.project_id = p.id
  left join contact_coverage cc on cc.project_id = p.id
  order by p.name;
$$;

comment on function public.report_project_readiness is
  'Test gotowości projektu (docs/09) jako zapytanie. 5 z 8 pozycji checkable dziś (etap aktualny, '
  'sloty obsadzone, lider etapu, ROT z właścicielem i datą kontroli, data ostatniego kontaktu) — 3 '
  'zostają ''niedostępne'' (profil klienta, kanał komunikacji jako decyzja, podmioty zewnętrzne '
  '''kto zatrudnia'' — ostatnie to pole istniejące, ale w praktyce puste, nie luka kodowa).';

grant execute on function public.report_project_readiness() to authenticated;

-- Asercje ---------------------------------------------------------------------
do $$
declare
  v_total integer;
  v_rot_ok integer;
  v_contact_ok integer;
  v_niedostepne_reszta integer;
begin
  select count(*) into v_total from projects;
  if v_total <> 177 then
    raise exception 'Zmienila sie liczba projektow: oczekiwano 177, jest %', v_total;
  end if;

  select count(*) filter (where rot_przeniesione_z_wlascicielem_i_data_kontroli = 'spełnione'),
         count(*) filter (where data_ostatniego_kontaktu = 'spełnione')
    into v_rot_ok, v_contact_ok
    from report_project_readiness();

  if v_rot_ok <> 168 then
    raise exception 'Oczekiwano 168 projektow z ROT spelnionym, jest %', v_rot_ok;
  end if;
  if v_contact_ok <> 6 then
    raise exception 'Oczekiwano 6 projektow z kontaktem spelnionym, jest %', v_contact_ok;
  end if;

  -- Trzy pozostale pozycje musza zostac 'niedostepne' dla KAZDEGO wiersza — zaden czesciowy check.
  select count(*) into v_niedostepne_reszta
  from report_project_readiness()
  where profil_klienta = 'niedostępne'
    and kanal_komunikacji = 'niedostępne'
    and podmioty_zewnetrzne_kto_zatrudnia = 'niedostępne';
  if v_niedostepne_reszta <> v_total then
    raise exception 'Nie wszystkie wiersze maja 3 pozostale pozycje jako niedostepne: % z %',
      v_niedostepne_reszta, v_total;
  end if;

  raise notice 'OK: % projektow, % z ROT spelnionym, % z kontaktem spelnionym, 3 pozostale niedostepne wszedzie.',
    v_total, v_rot_ok, v_contact_ok;
end $$;
