-- ═══════════════════════════════════════════════════════════════════════════
-- SRI (Smart Readiness Indicator) — schemat katalogu + proweniencja importu
-- Metodologia: Delegated Regulation (EU) 2020/2155 + Implementing Reg. 2020/2156
-- Zrodlo danych liczbowych: oficjalny arkusz KE "SRI calculation sheet v4.5"
--
-- Ta migracja tworzy WYLACZNIE strukture + slowniki stabilne (domeny, kryteria,
-- key functionalities, klasy) + rekord proweniencji importu. Masowy seed katalogu
-- (54 uslugi, 228 impact scores, 630 wag domen) idzie z plikow JSON w
-- docs/sri/catalogue/ osobnym krokiem (loader) — patrz SRI-KNOWLEDGE-BASE-STATUS.md.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Wersjonowanie metodologii ──────────────────────────────────────────────
create table if not exists public.sri_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_basis text not null,
  effective_from date not null,
  supersedes_id uuid references public.sri_methodology_versions(id),
  status text not null check (status in ('draft', 'active', 'deprecated')),
  created_at timestamptz not null default now()
);

-- ── Proweniencja importow (aktualizowalnosc na przyszle wersje SRI) ─────────
-- Kazdy import oficjalnego pakietu KE zapisuje sie tu: pozwala porownac wersje
-- (v4.5 -> v5.0) i wykryc, czy plik zrodlowy / dane realnie sie zmienily.
create table if not exists public.sri_source_imports (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid references public.sri_methodology_versions(id),
  source_version text not null,             -- np. "SRI calculation sheet v4.5"
  source_filename text not null,
  source_role text,                         -- primary_dataset | practical_guide
  import_hash text not null,                -- SHA-256 pliku zrodlowego (Excel)
  source_size_bytes bigint,
  source_checksum text not null,            -- SHA-256 znormalizowanego zbioru danych
  importer_version text not null,           -- wersja skryptu ekstrahujacego
  import_date date not null,
  record_counts jsonb not null default '{}',
  notes text,
  imported_at timestamptz not null default now()
);

create index if not exists sri_source_imports_version_idx
  on public.sri_source_imports (methodology_version_id, import_date desc);

create table if not exists public.sri_catalogues (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  code text not null,
  method text not null check (method in ('A', 'B', 'national')),
  locale text not null default 'en',
  service_count int not null default 0,
  source_import_id uuid references public.sri_source_imports(id),
  unique (methodology_version_id, code)
);

-- ── Slowniki metodologii ────────────────────────────────────────────────────
create table if not exists public.sri_key_functionalities (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  unique (methodology_version_id, code)
);

create table if not exists public.sri_technical_domains (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  source_document text,
  unique (methodology_version_id, code)
);

create table if not exists public.sri_impact_criteria (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  key_functionality_id uuid references public.sri_key_functionalities(id),
  unique (methodology_version_id, code)
);

-- ── Katalog uslug ───────────────────────────────────────────────────────────
create table if not exists public.sri_services (
  id uuid primary key default gen_random_uuid(),
  catalogue_id uuid not null references public.sri_catalogues(id) on delete cascade,
  domain_id uuid not null references public.sri_technical_domains(id),
  official_code text not null,              -- kod z arkusza KE, np. 'H-1a'
  internal_code text,                       -- stabilny kod Rentgen, np. 'H-01'
  sort_order int not null,
  official_name jsonb not null,             -- {"en": "...", "pl": "..."}
  service_group text,
  description jsonb,
  purpose jsonb,
  when_applicable jsonb,
  typical_devices text[],
  preconditions text,
  fl_max smallint,
  included_in_method_a boolean not null default false,
  included_in_method_b boolean not null default true,
  triage_affects_max boolean not null default false,
  applicability_mode text not null default 'smart_ready'
    check (applicability_mode in ('smart_ready', 'smart_possible')),
  mutual_exclusion_group text,
  standards_basis text[],
  provenance text not null default 'VERIFIED_ANNEX_D',
  unique (catalogue_id, official_code)
);

create table if not exists public.sri_functionality_levels (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.sri_services(id) on delete cascade,
  level_number smallint not null check (level_number between 0 and 4),
  official_description jsonb not null,
  practical_description jsonb,
  unique (service_id, level_number)
);

-- UWAGA: score bez CHECK >= 0 — metodologia SRI dopuszcza wartosci ujemne (min -2).
create table if not exists public.sri_functionality_level_impact_scores (
  functionality_level_id uuid not null
    references public.sri_functionality_levels(id) on delete cascade,
  impact_criterion_id uuid not null references public.sri_impact_criteria(id),
  score smallint not null,
  primary key (functionality_level_id, impact_criterion_id)
);

-- ── Wagi (przechowywane jako ulamki 0..1, tak jak w arkuszu KE) ─────────────
create table if not exists public.sri_impact_criterion_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  impact_criterion_id uuid not null references public.sri_impact_criteria(id),
  building_type text not null check (building_type in ('residential', 'non_residential')),
  weight numeric not null,                  -- W_f(ic), suma = 1 per typ budynku
  unique (methodology_version_id, impact_criterion_id, building_type)
);

create table if not exists public.sri_domain_impact_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  domain_id uuid not null references public.sri_technical_domains(id),
  impact_criterion_id uuid not null references public.sri_impact_criteria(id),
  building_type text not null check (building_type in ('residential', 'non_residential')),
  climate_zone text not null,               -- north/west/south/north_east/south_east_europe
  weight numeric not null,                  -- W(d,ic), suma po domenach = 1 per kryterium
  unique (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone)
);

-- ── Klasy SRI (Annex VIII) ──────────────────────────────────────────────────
create table if not exists public.sri_class_bands (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references public.sri_methodology_versions(id),
  class_number int not null check (class_number between 1 and 7),
  label text,
  score_min_percent numeric(5,2) not null,
  score_max_percent numeric(5,2) not null,
  unique (methodology_version_id, class_number)
);

-- ── Indeksy ─────────────────────────────────────────────────────────────────
create index if not exists sri_services_domain_idx on public.sri_services(domain_id);
create index if not exists sri_services_catalogue_idx on public.sri_services(catalogue_id);
create index if not exists sri_fl_service_idx on public.sri_functionality_levels(service_id);
create index if not exists sri_scores_fl_idx
  on public.sri_functionality_level_impact_scores(functionality_level_id);
create index if not exists sri_domain_weights_lookup_idx
  on public.sri_domain_impact_weights(methodology_version_id, impact_criterion_id, building_type, climate_zone);

-- ── RLS: dane referencyjne — odczyt dla wszystkich, zapis tylko service_role ─
alter table public.sri_methodology_versions enable row level security;
alter table public.sri_source_imports enable row level security;
alter table public.sri_catalogues enable row level security;
alter table public.sri_key_functionalities enable row level security;
alter table public.sri_technical_domains enable row level security;
alter table public.sri_impact_criteria enable row level security;
alter table public.sri_services enable row level security;
alter table public.sri_functionality_levels enable row level security;
alter table public.sri_functionality_level_impact_scores enable row level security;
alter table public.sri_impact_criterion_weights enable row level security;
alter table public.sri_domain_impact_weights enable row level security;
alter table public.sri_class_bands enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'sri_methodology_versions','sri_source_imports','sri_catalogues',
    'sri_key_functionalities','sri_technical_domains','sri_impact_criteria',
    'sri_services','sri_functionality_levels','sri_functionality_level_impact_scores',
    'sri_impact_criterion_weights','sri_domain_impact_weights','sri_class_bands'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_select_all', t);
    execute format('create policy %I on public.%I for select using (true);', t || '_select_all', t);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: wersja metodologii, katalogi, slowniki stabilne, klasy + rekord importu
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.sri_methodology_versions (id, code, legal_basis, effective_from, status)
values (
  '00000000-0000-4000-a000-000000000001',
  'eu-2020-2155-v1',
  'Delegated Regulation (EU) 2020/2155 + Implementing Regulation (EU) 2020/2156',
  '2020-12-21',
  'active'
) on conflict (code) do nothing;

-- Rekord proweniencji tego importu (SRI v4.5)
insert into public.sri_source_imports (
  id, methodology_version_id, source_version, source_filename, source_role,
  import_hash, source_size_bytes, source_checksum, importer_version, import_date, record_counts, notes
) values (
  '00000000-0000-4000-a000-0000000000a1',
  '00000000-0000-4000-a000-000000000001',
  'SRI calculation sheet v4.5',
  'SRI_calculation-sheet_v4.5.xlsx',
  'primary_dataset',
  '255e1e696a8da283ffdba0c37d902e1a0b78c5d75dcbbe275268ef1e55362da5',
  660869,
  'fea84a1931abb38c78e6ede524120c9c3527d8330407cbe5ff10e74f06ef95a4',
  '1.0.0',
  '2026-07-08',
  '{"services_method_b":54,"services_method_a":27,"impact_score_rows":228,"domain_weight_rows":630,"impact_weight_rows":14,"class_bands":7}',
  'Import z oficjalnego arkusza KE. Pliki zrodlowe poza repo (T&C KE). Dane katalogu: docs/sri/catalogue/.'
) on conflict (id) do nothing;

-- Katalogi Method A / Method B
insert into public.sri_catalogues (methodology_version_id, code, method, locale, service_count, source_import_id)
values
  ('00000000-0000-4000-a000-000000000001', 'eu-method-b-2020-v4.5', 'B', 'en', 54, '00000000-0000-4000-a000-0000000000a1'),
  ('00000000-0000-4000-a000-000000000001', 'eu-method-a-2020-v4.5', 'A', 'en', 27, '00000000-0000-4000-a000-0000000000a1')
on conflict (methodology_version_id, code) do nothing;

-- Key functionalities (Annex I/III)
insert into public.sri_key_functionalities (methodology_version_id, code, sort_order, name)
values
  ('00000000-0000-4000-a000-000000000001', 'energy_performance_and_operation', 1,
   '{"en":"Energy performance and operation","pl":"Efektywność energetyczna i eksploatacja"}'),
  ('00000000-0000-4000-a000-000000000001', 'response_to_occupant_needs', 2,
   '{"en":"Response to user needs","pl":"Reakcja na potrzeby użytkowników"}'),
  ('00000000-0000-4000-a000-000000000001', 'energy_flexibility', 3,
   '{"en":"Energy flexibility","pl":"Elastyczność energetyczna"}')
on conflict (methodology_version_id, code) do nothing;

-- Domeny techniczne (Annex IV) — 9 domen
insert into public.sri_technical_domains (methodology_version_id, code, sort_order, name, source_document)
values
  ('00000000-0000-4000-a000-000000000001', 'heating', 1, '{"en":"Heating","pl":"Ogrzewanie"}', 'Reg. (EU) 2020/2155 Annex IV(a)'),
  ('00000000-0000-4000-a000-000000000001', 'cooling', 2, '{"en":"Cooling","pl":"Chłodzenie"}', 'Annex IV(b)'),
  ('00000000-0000-4000-a000-000000000001', 'domestic_hot_water', 3, '{"en":"Domestic hot water","pl":"Ciepła woda użytkowa (CWU)"}', 'Annex IV(c)'),
  ('00000000-0000-4000-a000-000000000001', 'ventilation', 4, '{"en":"Ventilation","pl":"Wentylacja"}', 'Annex IV(d)'),
  ('00000000-0000-4000-a000-000000000001', 'lighting', 5, '{"en":"Lighting","pl":"Oświetlenie"}', 'Annex IV(e)'),
  ('00000000-0000-4000-a000-000000000001', 'dynamic_building_envelope', 6, '{"en":"Dynamic building envelope","pl":"Dynamiczna powłoka budynku"}', 'Annex IV(f)'),
  ('00000000-0000-4000-a000-000000000001', 'electricity', 7, '{"en":"Electricity","pl":"Elektryczność"}', 'Annex IV(g)'),
  ('00000000-0000-4000-a000-000000000001', 'electric_vehicle_charging', 8, '{"en":"Electric vehicle charging","pl":"Ładowanie pojazdów elektrycznych"}', 'Annex IV(h)'),
  ('00000000-0000-4000-a000-000000000001', 'monitoring_and_control', 9, '{"en":"Monitoring and control","pl":"Monitorowanie i sterowanie"}', 'Annex IV(i)')
on conflict (methodology_version_id, code) do nothing;

-- Kryteria oddzialywania (Annex II) — 7 kryteriow, powiazane z key functionalities
insert into public.sri_impact_criteria (methodology_version_id, code, sort_order, name, key_functionality_id)
select v.mid, c.code, c.sort_order, c.name::jsonb, kf.id
from (values
  ('energy_efficiency', 1, '{"en":"Energy efficiency","pl":"Efektywność energetyczna"}', 'energy_performance_and_operation'),
  ('maintenance_and_fault_prediction', 2, '{"en":"Maintenance and fault prediction","pl":"Konserwacja i predykcja awarii"}', 'energy_performance_and_operation'),
  ('comfort', 3, '{"en":"Comfort","pl":"Komfort"}', 'response_to_occupant_needs'),
  ('convenience', 4, '{"en":"Convenience","pl":"Wygoda"}', 'response_to_occupant_needs'),
  ('health_wellbeing_accessibility', 5, '{"en":"Health, well-being and accessibility","pl":"Zdrowie, dobrostan i dostępność"}', 'response_to_occupant_needs'),
  ('information_to_occupants', 6, '{"en":"Information to occupants","pl":"Informacja dla użytkowników"}', 'response_to_occupant_needs'),
  ('energy_flexibility_and_storage', 7, '{"en":"Energy flexibility and storage","pl":"Elastyczność energetyczna i magazynowanie"}', 'energy_flexibility')
) as c(code, sort_order, name, kf_code)
cross join (select '00000000-0000-4000-a000-000000000001'::uuid as mid) v
join public.sri_key_functionalities kf
  on kf.code = c.kf_code and kf.methodology_version_id = v.mid
on conflict (methodology_version_id, code) do nothing;

-- Klasy SRI (Annex VIII)
insert into public.sri_class_bands (methodology_version_id, class_number, label, score_min_percent, score_max_percent)
values
  ('00000000-0000-4000-a000-000000000001', 1, 'A', 90, 100),
  ('00000000-0000-4000-a000-000000000001', 2, 'B', 80, 90),
  ('00000000-0000-4000-a000-000000000001', 3, 'C', 65, 80),
  ('00000000-0000-4000-a000-000000000001', 4, 'D', 50, 65),
  ('00000000-0000-4000-a000-000000000001', 5, 'E', 35, 50),
  ('00000000-0000-4000-a000-000000000001', 6, 'F', 20, 35),
  ('00000000-0000-4000-a000-000000000001', 7, 'G', 0, 20)
on conflict (methodology_version_id, class_number) do nothing;
