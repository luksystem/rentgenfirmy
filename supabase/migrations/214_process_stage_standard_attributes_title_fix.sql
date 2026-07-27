-- Naprawa migracji 209: seed dopasowywał etapy po dokładnym tytule z /docs/01-standard-procesu.md,
-- ale żywy szablon w produkcji ma inne tytuły (prefiksy "Etap N - "/"ETAP N – ", inny myślnik,
-- "Montaż urządzeń" zamiast "Montaże urządzeń", "Dostawa i montaż rozdzielni" zamiast
-- "Dostawa i podłączenie rozdzielni" itd.) — dokładnie ryzyko odnotowane w komentarzu 209,
-- potwierdzone zapytaniem: 0/10 etapów miało ustawione base_communication_phase.
--
-- Ta migracja dopasowuje etapy po charakterystycznym fragmencie (ILIKE), odpornym na
-- różnice w myślniku, wielkości liter i białych znakach — nie po dokładnym tytule.
--
-- ZASTĄPIONE przez 215 (process_stages.code — stabilny slug, niezależny od tytułu i wzorca).
-- Ten plik zostaje jako zapis historyczny naprawy doraźnej; kanoniczny, odporny na przyszłość
-- seed (kluczujący na code, z asercją liczby wierszy) jest w 215.

do $$
declare
  v_pattern text;
  v_phase public.communication_phase_code;
  v_count int;
  v_pairs text[][] := array[
    array['%Uruchomienie projektu%', 'INTENSYWNA'],
    array['%zebranie danych projektowych%', 'STANDARD'],
    array['%projekt koncepcyjny%', 'INTENSYWNA'],
    array['%instalacji elektrycznej%', 'STANDARD'],
    array['%Koordynacja przed monta%', 'STANDARD'],
    array['%Prefabrykacja rozdzielni%', 'CZUWANIE'],
    array['%Dostawa i monta%rozdzielni%', 'INTENSYWNA'],
    array['%Monta%urządzeń%', 'INTENSYWNA'],
    array['%Uruchomienie, testy i przekazanie systemu%', 'KRYTYCZNA'],
    array['%Optymalizacja po zamieszkaniu%', 'STANDARD']
  ];
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    v_pattern := v_pairs[i][1];
    v_phase := v_pairs[i][2]::public.communication_phase_code;

    update public.process_stages
      set base_communication_phase = v_phase
      where title ilike v_pattern and base_communication_phase is null;

    get diagnostics v_count = row_count;
    if v_count = 0 then
      raise warning 'Wzorzec "%": nadal brak dopasowania. Sprawdź tytuł ręcznie.', v_pattern;
    else
      raise notice 'Wzorzec "%": ustawiono base_communication_phase=% (% wierszy)', v_pattern, v_phase, v_count;
    end if;
  end loop;
end $$;

do $$
declare
  v_count int;
begin
  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('poprawki_dok', 7)
    where title ilike '%Prefabrykacja rozdzielni%';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu pasującego do "Prefabrykacja rozdzielni" — SLA poprawki_dok nie ustawione.';
  end if;

  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('rozstrzygniecie', 7)
    where title ilike '%Dostawa i monta%rozdzielni%';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu pasującego do "Dostawa i montaż rozdzielni" — SLA rozstrzygniecie nie ustawione.';
  end if;
end $$;

do $$
declare
  v_count int;
begin
  update public.process_stages
    set requires_project_stage_lead = true
    where title ilike '%Monta%urządzeń%';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu pasującego do "Montaż urządzeń" — requires_project_stage_lead nie ustawione.';
  end if;
end $$;

-- Macierz odpowiedzialności rola x etap (/docs/02 §10) — ta sama logika co 209, dopasowanie
-- po wzorcu zamiast dokładnym tytule.
do $$
declare
  v_stage_id uuid;
  v_rows text[][] := array[
    array['%Uruchomienie projektu%', 'wlasciciel', 'true', 'false', 'false'],
    array['%Uruchomienie projektu%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Uruchomienie projektu%', 'koordynator_operacyjny', 'false', 'true', 'false'],

    array['%zebranie danych projektowych%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%zebranie danych projektowych%', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['%zebranie danych projektowych%', 'projektant', 'true', 'false', 'false'],

    array['%projekt koncepcyjny%', 'wlasciciel', 'false', 'true', 'false'],
    array['%projekt koncepcyjny%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%projekt koncepcyjny%', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['%projekt koncepcyjny%', 'projektant', 'true', 'false', 'true'],

    array['%instalacji elektrycznej%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%instalacji elektrycznej%', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['%instalacji elektrycznej%', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['%instalacji elektrycznej%', 'projektant', 'false', 'true', 'false'],

    array['%Koordynacja przed monta%', 'wlasciciel', 'false', 'true', 'false'],
    array['%Koordynacja przed monta%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Koordynacja przed monta%', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['%Koordynacja przed monta%', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['%Koordynacja przed monta%', 'projektant', 'false', 'true', 'false'],

    array['%Prefabrykacja rozdzielni%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Prefabrykacja rozdzielni%', 'koordynator_operacyjny', 'true', 'false', 'false'],
    array['%Prefabrykacja rozdzielni%', 'projektant', 'false', 'true', 'false'],
    array['%Prefabrykacja rozdzielni%', 'wdrozeniowiec', 'false', 'true', 'false'],

    array['%Dostawa i monta%rozdzielni%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Dostawa i monta%rozdzielni%', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['%Dostawa i monta%rozdzielni%', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['%Dostawa i monta%rozdzielni%', 'lider_montazu', 'false', 'true', 'false'],

    array['%Monta%urządzeń%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Monta%urządzeń%', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['%Monta%urządzeń%', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['%Monta%urządzeń%', 'lider_montazu', 'false', 'true', 'false'],

    array['%Uruchomienie, testy i przekazanie systemu%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Uruchomienie, testy i przekazanie systemu%', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['%Uruchomienie, testy i przekazanie systemu%', 'wdrozeniowiec', 'true', 'false', 'true'],

    array['%Optymalizacja po zamieszkaniu%', 'wlasciciel', 'false', 'true', 'false'],
    array['%Optymalizacja po zamieszkaniu%', 'opiekun_projektu', 'false', 'false', 'true'],
    array['%Optymalizacja po zamieszkaniu%', 'wdrozeniowiec', 'true', 'false', 'true']
  ];
begin
  for i in 1 .. array_length(v_rows, 1) loop
    select id into v_stage_id from public.process_stages where title ilike v_rows[i][1] limit 1;

    if v_stage_id is null then
      raise warning 'Wzorzec "%": brak etapu, wiersz macierzy dla roli % pominięty.', v_rows[i][1], v_rows[i][2];
      continue;
    end if;

    insert into public.process_stage_role_responsibility
      (stage_id, role_code, is_glowny, is_wspiera, is_komunikuje)
    values
      (v_stage_id, v_rows[i][2], v_rows[i][3]::boolean, v_rows[i][4]::boolean, v_rows[i][5]::boolean)
    on conflict (stage_id, role_code) do update
      set is_glowny = excluded.is_glowny,
          is_wspiera = excluded.is_wspiera,
          is_komunikuje = excluded.is_komunikuje;
  end loop;
end $$;
