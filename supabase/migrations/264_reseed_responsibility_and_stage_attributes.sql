-- D42 — reseed macierzy odpowiedzialnosci i atrybutow etapu z fazy 1.
--
-- Oba zestawy zniknely przez delete+insert w saveProcessTemplate (D41, naprawione upsertem).
-- Reseed z tresci migracji 215 (nie 209/214 — tamte kluczowaly na TYTULACH etapow, co je wywalilo
-- za pierwszym razem). Tu wszystko idzie po `process_stages.code` i asertuje liczbe wierszy.
--
-- ZMIANA WOBEC 215: asystent_procesu jako "wspiera" na WSZYSTKICH 10 etapach (decyzja wlasciciela).
-- Sprawdzone przed seedem, czy to bezpieczne: `is_wspiera` NIE steruje dzis niczym — wszystkie trzy
-- funkcje czytajace macierz (report_stage_commitments, report_commitment_warnings,
-- report_leave_commitment_impact) uzywaja WYLACZNIE `is_glowny`. Zero ryzyka przekierowania
-- powiadomien na fallback. Gdy faza 11b zacznie czytac `is_komunikuje`, temat wraca — ale dotyczy
-- wtedy opiekuna (K na 10 etapach), nie asystenta.
--
-- Wagi weight_comm/weight_coord swiadomie NIE seedowane — docs/role/05 §3.2 mowi, ze to wartosci
-- "seed" czekajace na kalibracje, a wartosc orientacyjna udajaca pomiar jest gorsza niz jej brak.

-- ── 1. base_communication_phase — najpierw DOM, potem reszta na STANDARD ────────────────────────
do $$
declare
  v_updated int;
  v_pairs text[][] := array[
    array['etap_01', 'INTENSYWNA'],
    array['etap_02', 'STANDARD'],
    array['etap_03', 'INTENSYWNA'],
    array['etap_04', 'STANDARD'],
    array['etap_05', 'STANDARD'],
    array['etap_06', 'CZUWANIE'],
    array['etap_07', 'INTENSYWNA'],
    array['etap_08', 'INTENSYWNA'],
    array['etap_09', 'KRYTYCZNA'],
    array['etap_10', 'STANDARD']
  ];
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    update public.process_stages
      set base_communication_phase = v_pairs[i][2]::public.communication_phase_code
      where code = v_pairs[i][1];
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'base_communication_phase: kod "%" — oczekiwano 1 wiersza, wyszlo %.',
        v_pairs[i][1], v_updated;
    end if;
  end loop;
end $$;

-- Szablony inne niz DOM (BMS/Audio/Przemyslowe/Serwis/Inne) nie maja kodow etap_NN, wiec zostalyby
-- z NULL-em. W bramach fazy 11a NULL czytalby sie jako BRAK KOMUNIKACJI — trzy zywe projekty BMS
-- w ciszy bez widocznego powodu. Zamiast zostawiac to jako pulapke: domyslna STANDARD + NOT NULL,
-- czyli stan "brak fazy" przestaje byc reprezentowalny. Bramy 11a nie musza obslugiwac NULL-a,
-- bo nie ma jak go uzyskac.
update public.process_stages
set base_communication_phase = 'STANDARD'::public.communication_phase_code
where base_communication_phase is null;

alter table public.process_stages
  alter column base_communication_phase set default 'STANDARD'::public.communication_phase_code,
  alter column base_communication_phase set not null;

-- ── 2. sla_days i requires_project_stage_lead (docs/role/03, docs/role/02) ───────────────────────
do $$
declare
  v_updated int;
begin
  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('poprawki_dok', 7)
    where code = 'etap_06';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sla_days poprawki_dok: oczekiwano 1 wiersz (etap_06), wyszlo %.', v_updated;
  end if;

  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('rozstrzygniecie', 7)
    where code = 'etap_07';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'sla_days rozstrzygniecie: oczekiwano 1 wiersz (etap_07), wyszlo %.', v_updated;
  end if;

  update public.process_stages
    set requires_project_stage_lead = true
    where code = 'etap_08';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'requires_project_stage_lead: oczekiwano 1 wiersz (etap_08), wyszlo %.', v_updated;
  end if;
end $$;

-- ── 3. Macierz odpowiedzialnosci: 37 wierszy z 215 + 10 dla asystenta ───────────────────────────
do $$
declare
  v_stage_id uuid;
  v_inserted int := 0;
  v_total int;
  v_glowni int;
  v_rows text[][] := array[
    array['etap_01', 'wlasciciel', 'true', 'false', 'false'],
    array['etap_01', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_01', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_02', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_02', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_02', 'projektant', 'true', 'false', 'false'],
    array['etap_03', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_03', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_03', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['etap_03', 'projektant', 'true', 'false', 'true'],
    array['etap_04', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_04', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_04', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['etap_04', 'projektant', 'false', 'true', 'false'],
    array['etap_05', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_05', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_05', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_05', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['etap_05', 'projektant', 'false', 'true', 'false'],
    array['etap_06', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_06', 'koordynator_operacyjny', 'true', 'false', 'false'],
    array['etap_06', 'projektant', 'false', 'true', 'false'],
    array['etap_06', 'wdrozeniowiec', 'false', 'true', 'false'],
    array['etap_07', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_07', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_07', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['etap_07', 'lider_montazu', 'false', 'true', 'false'],
    array['etap_08', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_08', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['etap_08', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['etap_08', 'lider_montazu', 'false', 'true', 'false'],
    array['etap_09', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_09', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['etap_09', 'wdrozeniowiec', 'true', 'false', 'true'],
    array['etap_10', 'wlasciciel', 'false', 'true', 'false'],
    array['etap_10', 'opiekun_projektu', 'false', 'false', 'true'],
    array['etap_10', 'wdrozeniowiec', 'true', 'false', 'true'],
    array['etap_01', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_02', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_03', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_04', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_05', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_06', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_07', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_08', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_09', 'asystent_procesu', 'false', 'true', 'false'],
    array['etap_10', 'asystent_procesu', 'false', 'true', 'false']
  ];
begin
  for i in 1 .. array_length(v_rows, 1) loop
    select id into v_stage_id from public.process_stages where code = v_rows[i][1];

    if v_stage_id is null then
      raise exception 'Macierz odpowiedzialnosci: kod "%" nie istnieje w process_stages.', v_rows[i][1];
    end if;

    insert into public.process_stage_role_responsibility
      (stage_id, role_code, is_glowny, is_wspiera, is_komunikuje)
    values
      (v_stage_id, v_rows[i][2], v_rows[i][3]::boolean, v_rows[i][4]::boolean, v_rows[i][5]::boolean)
    on conflict (stage_id, role_code) do update
      set is_glowny = excluded.is_glowny,
          is_wspiera = excluded.is_wspiera,
          is_komunikuje = excluded.is_komunikuje;
    v_inserted := v_inserted + 1;
  end loop;

  if v_inserted <> 47 then
    raise exception 'Macierz: oczekiwano 47 wierszy, przetworzono %.', v_inserted;
  end if;

  select count(*) into v_total
  from public.process_stage_role_responsibility r
  join public.process_stages s on s.id = r.stage_id
  where s.code like 'etap_%';
  if v_total <> 47 then
    raise exception 'Macierz: po seedzie oczekiwano 47 wierszy w bazie, jest %.', v_total;
  end if;

  -- Kazdy z 10 etapow musi miec DOKLADNIE jednego glownego — inaczej rozwiazywanie
  -- odpowiedzialnego byloby niejednoznaczne i cicho wybraloby pierwszego z brzegu.
  select count(*) into v_glowni
  from (
    select r.stage_id
    from public.process_stage_role_responsibility r
    join public.process_stages s on s.id = r.stage_id
    where s.code like 'etap_%' and r.is_glowny
    group by r.stage_id
    having count(*) = 1
  ) x;
  if v_glowni <> 10 then
    raise exception 'Macierz: oczekiwano 10 etapow z dokladnie jednym glownym, jest %.', v_glowni;
  end if;
end $$;
