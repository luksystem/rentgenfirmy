-- Faza 1 — Standard firmy w szablonie procesu (docs/08 D1, D6, D10).
-- Wszystko poniżej żyje WYŁĄCZNIE w process_stages / template_snapshot — nie jest
-- edytowalne per projekt (D1). Kody ról wg /docs/08 D10 (finalne, 9 kodów).
--
-- ZASTĄPIONE: seed poniżej kluczuje na title i w produkcji trafił w zero wierszy (rzeczywiste
-- tytuły etapów różnią się od /docs/01). Naprawione w 214 (dopasowanie ILIKE), a docelowo w 215
-- (process_stages.code — stabilny slug, niezależny od tytułu). Ten plik zostaje jako zapis
-- historyczny; nie uruchamiaj go ponownie na świeżym środowisku bez 214+215 zaraz po nim.

do $$ begin
  create type public.communication_phase_code as enum ('CZUWANIE', 'STANDARD', 'INTENSYWNA', 'KRYTYCZNA');
exception when duplicate_object then null; end $$;

alter table public.process_stages
  add column if not exists base_communication_phase public.communication_phase_code,
  add column if not exists weight_comm numeric,
  add column if not exists weight_coord numeric,
  add column if not exists sla_days jsonb not null default '{}'::jsonb,
  add column if not exists requires_project_stage_lead boolean not null default false;

comment on column public.process_stages.base_communication_phase is
  'Faza bazowa komunikacji dla etapu, standard firmy (/docs/03 §2). Kopiowana do template_snapshot, nieedytowalna per projekt (D1).';
comment on column public.process_stages.weight_comm is
  'Waga komunikacyjna etapu — seed, NULL do kalibracji w fazie 10 (/docs/05 §4.3). Nie zgadywać liczby.';
comment on column public.process_stages.weight_coord is
  'Waga koordynacyjna etapu — seed, NULL do kalibracji w fazie 10.';
comment on column public.process_stages.sla_days is
  'SLA w dniach dla elementów tego etapu, np. {"rozstrzygniecie": 7, "poprawki_dok": 7}. Standard firmy (D1).';
comment on column public.process_stages.requires_project_stage_lead is
  'Czy etap wymaga wyznaczenia Lidera Etapu na poziomie projektu (project_stage_leads). '
  'NIEZALEŻNE od requires_leader (ostrzeżenie o liderze/assignee w walidacji Planu Zasobów) — '
  'dwa różne poziomy, nie synonimy. Nie ujednolicać.';

create table if not exists public.process_stage_role_responsibility (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.process_stages (id) on delete cascade,
  role_code text not null,
  is_glowny boolean not null default false,
  is_wspiera boolean not null default false,
  is_komunikuje boolean not null default false,
  created_at timestamptz not null default now(),
  unique (stage_id, role_code)
);

comment on table public.process_stage_role_responsibility is
  'Macierz odpowiedzialności rola x etap, /docs/02 §10. Standard firmy, kopiowana do template_snapshot (D1). '
  'Trzy niezależne booleany zamiast jednej wartości enum, bo komórki typu "G/K" (np. projektant na Etapie 3) '
  'wymagają dwóch jednoczesnych odpowiedzialności na tej samej parze (stage, rola).';
comment on column public.process_stage_role_responsibility.role_code is
  'Kod roli wg /docs/08 D10: wlasciciel, opiekun_projektu, koordynator_operacyjny, koordynator_techniczny, '
  'projektant, wdrozeniowiec, lider_montazu, instalator, asystent_procesu. Macierz odpowiedzialności etapowej '
  'używa siedmiu — instalator i asystent_procesu nie niosą odpowiedzialności etapowej.';

create index if not exists process_stage_role_responsibility_stage_idx
  on public.process_stage_role_responsibility (stage_id);

alter table public.process_stage_role_responsibility enable row level security;

drop policy if exists "process_stage_role_responsibility_all" on public.process_stage_role_responsibility;
create policy "process_stage_role_responsibility_all" on public.process_stage_role_responsibility
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed: fazy bazowe komunikacji wg /docs/03 §2. Dopasowanie po tytule etapu —
-- nie mamy dostępu do żywej bazy, więc każdy brak dopasowania jest odnotowany
-- jako RAISE WARNING zamiast cichego zera. Sprawdź wynik w SQL Editorze.
-- ---------------------------------------------------------------------------

do $$
declare
  v_title text;
  v_phase public.communication_phase_code;
  v_count int;
  v_pairs text[][] := array[
    array['Uruchomienie projektu', 'INTENSYWNA'],
    array['Zebranie danych projektowych', 'STANDARD'],
    array['Projektowanie i akceptacja projektu', 'INTENSYWNA'],
    array['Instalacja elektryczna i okablowanie', 'STANDARD'],
    array['Koordynacja przed montażem', 'STANDARD'],
    array['Prefabrykacja rozdzielni', 'CZUWANIE'],
    array['Dostawa i podłączenie rozdzielni', 'INTENSYWNA'],
    array['Montaże urządzeń', 'INTENSYWNA'],
    array['Uruchomienie, testy i przekazanie systemu', 'KRYTYCZNA'],
    array['Optymalizacja po zamieszkaniu', 'STANDARD']
  ];
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    v_title := v_pairs[i][1];
    v_phase := v_pairs[i][2]::public.communication_phase_code;

    update public.process_stages
      set base_communication_phase = v_phase
      where title = v_title;

    get diagnostics v_count = row_count;
    if v_count = 0 then
      raise warning 'Brak etapu o tytule "%": faza bazowa % nie została ustawiona nigdzie.', v_title, v_phase;
    else
      raise notice 'Etap "%": ustawiono base_communication_phase=% (% wierszy)', v_title, v_phase, v_count;
    end if;
  end loop;
end $$;

-- SLA — tylko tam, gdzie 01/02 podają liczbę wprost. Reszta etapów zostaje '{}'.
do $$
declare
  v_count int;
begin
  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('poprawki_dok', 7)
    where title = 'Prefabrykacja rozdzielni';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu "Prefabrykacja rozdzielni": SLA poprawki_dok=7 nie zostało ustawione.';
  end if;

  update public.process_stages
    set sla_days = sla_days || jsonb_build_object('rozstrzygniecie', 7)
    where title = 'Dostawa i podłączenie rozdzielni';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu "Dostawa i podłączenie rozdzielni": SLA rozstrzygniecie=7 nie zostało ustawione.';
  end if;
end $$;

-- requires_project_stage_lead — wymagany wyłącznie na Etapie 8 (/docs/02 §7, /docs/04 §5).
do $$
declare
  v_count int;
begin
  update public.process_stages
    set requires_project_stage_lead = true
    where title = 'Montaże urządzeń';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise warning 'Brak etapu "Montaże urządzeń": requires_project_stage_lead nie zostało ustawione.';
  end if;
end $$;

-- Macierz odpowiedzialności rola x etap wg /docs/02 §10.
do $$
declare
  v_stage_id uuid;
  v_count int;

  -- (tytuł etapu, kod roli, głowny, wspiera, komunikuje)
  v_rows text[][] := array[
    array['Uruchomienie projektu', 'wlasciciel', 'true', 'false', 'false'],
    array['Uruchomienie projektu', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Uruchomienie projektu', 'koordynator_operacyjny', 'false', 'true', 'false'],

    array['Zebranie danych projektowych', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Zebranie danych projektowych', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['Zebranie danych projektowych', 'projektant', 'true', 'false', 'false'],

    array['Projektowanie i akceptacja projektu', 'wlasciciel', 'false', 'true', 'false'],
    array['Projektowanie i akceptacja projektu', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Projektowanie i akceptacja projektu', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['Projektowanie i akceptacja projektu', 'projektant', 'true', 'false', 'true'],

    array['Instalacja elektryczna i okablowanie', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Instalacja elektryczna i okablowanie', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['Instalacja elektryczna i okablowanie', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['Instalacja elektryczna i okablowanie', 'projektant', 'false', 'true', 'false'],

    array['Koordynacja przed montażem', 'wlasciciel', 'false', 'true', 'false'],
    array['Koordynacja przed montażem', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Koordynacja przed montażem', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['Koordynacja przed montażem', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['Koordynacja przed montażem', 'projektant', 'false', 'true', 'false'],

    array['Prefabrykacja rozdzielni', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Prefabrykacja rozdzielni', 'koordynator_operacyjny', 'true', 'false', 'false'],
    array['Prefabrykacja rozdzielni', 'projektant', 'false', 'true', 'false'],
    array['Prefabrykacja rozdzielni', 'wdrozeniowiec', 'false', 'true', 'false'],

    array['Dostawa i podłączenie rozdzielni', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Dostawa i podłączenie rozdzielni', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['Dostawa i podłączenie rozdzielni', 'koordynator_techniczny', 'true', 'false', 'true'],
    array['Dostawa i podłączenie rozdzielni', 'lider_montazu', 'false', 'true', 'false'],

    array['Montaże urządzeń', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Montaże urządzeń', 'koordynator_operacyjny', 'false', 'true', 'false'],
    array['Montaże urządzeń', 'koordynator_techniczny', 'true', 'false', 'false'],
    array['Montaże urządzeń', 'lider_montazu', 'false', 'true', 'false'],

    array['Uruchomienie, testy i przekazanie systemu', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Uruchomienie, testy i przekazanie systemu', 'koordynator_techniczny', 'false', 'true', 'false'],
    array['Uruchomienie, testy i przekazanie systemu', 'wdrozeniowiec', 'true', 'false', 'true'],

    array['Optymalizacja po zamieszkaniu', 'wlasciciel', 'false', 'true', 'false'],
    array['Optymalizacja po zamieszkaniu', 'opiekun_projektu', 'false', 'false', 'true'],
    array['Optymalizacja po zamieszkaniu', 'wdrozeniowiec', 'true', 'false', 'true']
  ];
begin
  for i in 1 .. array_length(v_rows, 1) loop
    select id into v_stage_id from public.process_stages where title = v_rows[i][1] limit 1;

    if v_stage_id is null then
      raise warning 'Brak etapu o tytule "%": wiersz macierzy dla roli % pominięty.', v_rows[i][1], v_rows[i][2];
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

    get diagnostics v_count = row_count;
  end loop;
end $$;
