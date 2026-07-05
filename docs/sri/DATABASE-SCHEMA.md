# SRI — propozycja schematu bazy danych (referencyjna)

> **Nie implementować w Supabase na tym etapie.** Schemat służy jako kontrakt dla przyszłej migracji.

## Konwencje

- Prefiks tabel: `sri_`
- Wersjonowanie: wszystkie definicje katalogowe powiązane z `sri_methodology_versions`
- i18n: kolumny `name`, `description` jako `jsonb` (`{"en": "...", "pl": "..."}`)

---

## DDL (PostgreSQL)

```sql
-- ═══════════════════════════════════════════════════════════════
-- WERSJONOWANIE METODOLOGII
-- ═══════════════════════════════════════════════════════════════

create table sri_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_basis text not null,
  effective_from date not null,
  supersedes_id uuid references sri_methodology_versions(id),
  status text not null check (status in ('draft', 'active', 'deprecated')),
  created_at timestamptz not null default now()
);

create table sri_catalogues (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  code text not null,
  method text not null check (method in ('A', 'B', 'national')),
  locale text not null default 'en',
  service_count int not null,
  unique (methodology_version_id, code)
);

-- ═══════════════════════════════════════════════════════════════
-- SŁOWNIKI METODOLOGII
-- ═══════════════════════════════════════════════════════════════

create table sri_key_functionalities (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  unique (methodology_version_id, code)
);

create table sri_technical_domains (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  source_document text,
  unique (methodology_version_id, code)
);

create table sri_impact_criteria (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  code text not null,
  sort_order int not null,
  name jsonb not null,
  description jsonb,
  key_functionality_id uuid not null references sri_key_functionalities(id),
  unique (methodology_version_id, code)
);

-- ═══════════════════════════════════════════════════════════════
-- KATALOG USŁUG
-- ═══════════════════════════════════════════════════════════════

create table sri_services (
  id uuid primary key default gen_random_uuid(),
  catalogue_id uuid not null references sri_catalogues(id),
  domain_id uuid not null references sri_technical_domains(id),
  code text not null,
  sort_order int not null,
  official_name jsonb not null,
  description jsonb,
  purpose jsonb,
  when_applicable jsonb,
  typical_devices text[],
  source_document text,
  included_in_method_a boolean not null default false,
  applicability_mode text not null check (applicability_mode in ('smart_ready', 'smart_possible')),
  mutual_exclusion_group text,
  standards_basis text[],
  unique (catalogue_id, code)
);

create table sri_functionality_levels (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references sri_services(id) on delete cascade,
  level_number int not null check (level_number between 0 and 4),
  official_description jsonb not null,
  practical_description jsonb,
  unique (service_id, level_number)
);

create table sri_functionality_level_impact_scores (
  functionality_level_id uuid not null references sri_functionality_levels(id) on delete cascade,
  impact_criterion_id uuid not null references sri_impact_criteria(id),
  score smallint not null,
  primary key (functionality_level_id, impact_criterion_id)
);

-- ═══════════════════════════════════════════════════════════════
-- WAGI (Annex III, V)
-- ═══════════════════════════════════════════════════════════════

create table sri_key_functionality_impact_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  key_functionality_id uuid not null references sri_key_functionalities(id),
  impact_criterion_id uuid not null references sri_impact_criteria(id),
  weight_percent numeric(5,2) not null,
  building_type text check (building_type in ('residential', 'non_residential', 'all')),
  unique (methodology_version_id, key_functionality_id, impact_criterion_id, building_type)
);

create table sri_domain_impact_weights (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  domain_id uuid not null references sri_technical_domains(id),
  impact_criterion_id uuid not null references sri_impact_criteria(id),
  building_type text not null check (building_type in ('residential', 'non_residential')),
  climate_zone text not null default 'default',
  weight_percent numeric(5,2) not null,
  weighting_method text not null check (weighting_method in ('energy_balance', 'fixed', 'equal')),
  unique (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone)
);

-- ═══════════════════════════════════════════════════════════════
-- KLASY SRI (Annex VIII)
-- ═══════════════════════════════════════════════════════════════

create table sri_class_bands (
  id uuid primary key default gen_random_uuid(),
  methodology_version_id uuid not null references sri_methodology_versions(id),
  class_number int not null check (class_number between 1 and 7),
  score_min_percent numeric(5,2) not null,
  score_max_percent numeric(5,2) not null,
  unique (methodology_version_id, class_number)
);

-- ═══════════════════════════════════════════════════════════════
-- ODNIESIENIA PRAWNE
-- ═══════════════════════════════════════════════════════════════

create table sri_official_references (
  id uuid primary key default gen_random_uuid(),
  document_eli text not null,
  annex text,
  article text,
  page text,
  paragraph text,
  url text,
  note text
);

create table sri_service_references (
  service_id uuid not null references sri_services(id) on delete cascade,
  reference_id uuid not null references sri_official_references(id),
  primary key (service_id, reference_id)
);

create table sri_domain_references (
  domain_id uuid not null references sri_technical_domains(id) on delete cascade,
  reference_id uuid not null references sri_official_references(id),
  primary key (domain_id, reference_id)
);

-- ═══════════════════════════════════════════════════════════════
-- OCENA BUDYNKU (przyszła warstwa — szkic)
-- ═══════════════════════════════════════════════════════════════

create table sri_building_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid, -- FK do projektów Rentgen (później)
  methodology_version_id uuid not null references sri_methodology_versions(id),
  catalogue_id uuid not null references sri_catalogues(id),
  method text not null check (method in ('A', 'B')),
  building_type text not null,
  climate_zone text not null,
  assessed_at timestamptz not null default now(),
  total_score_percent numeric(5,2),
  sri_class int,
  metadata jsonb default '{}'
);

create table sri_service_assessments (
  id uuid primary key default gen_random_uuid(),
  building_assessment_id uuid not null references sri_building_assessments(id) on delete cascade,
  service_id uuid not null references sri_services(id),
  triage_status text not null check (triage_status in ('applicable', 'excluded', 'not_present_smart_possible')),
  assessed_level_number int check (assessed_level_number between 0 and 4),
  unique (building_assessment_id, service_id)
);

create table sri_calculated_scores (
  building_assessment_id uuid not null references sri_building_assessments(id) on delete cascade,
  score_type text not null check (score_type in ('total', 'key_functionality', 'impact_criterion', 'domain_impact')),
  dimension_code text not null,
  score_percent numeric(5,2) not null,
  primary key (building_assessment_id, score_type, dimension_code)
);
```

---

## Indeksy zalecane

```sql
create index idx_sri_services_domain on sri_services(domain_id);
create index idx_sri_fl_service on sri_functionality_levels(service_id);
create index idx_sri_scores_fl on sri_functionality_level_impact_scores(functionality_level_id);
create index idx_sri_domain_weights_lookup
  on sri_domain_impact_weights(methodology_version_id, impact_criterion_id, building_type, climate_zone);
```

---

## Seed data (kolejność importu)

1. `sri_methodology_versions` — `eu-2020-2155-v1`
2. `sri_catalogues` — Method A + Method B
3. `sri_key_functionalities`, `sri_technical_domains`, `sri_impact_criteria`
4. `sri_services` z JSON (`catalogue/method-b-services.json`)
5. `sri_functionality_levels` + `sri_functionality_level_impact_scores` — z Annex D Excel
6. `sri_domain_impact_weights`, `sri_key_functionality_impact_weights` — domyślne UE
7. `sri_class_bands` — Annex VIII

---

## Mapowanie propozycji użytkownika → schemat

| Propozycja użytkownika | Tabela Rentgen |
|------------------------|----------------|
| Domain | `sri_technical_domains` |
| Service | `sri_services` (+ pola purpose, when_applicable, devices) |
| FunctionalityLevel | `sri_functionality_levels` |
| ImpactCriterion | `sri_impact_criteria` |
| ServiceImpact | `sri_functionality_level_impact_scores` |
| References | `sri_official_references` + junction tables |

Dodatkowo (wymagane metodologią UE): `MethodologyVersion`, `Catalogue`, wagi, klasy, triage w `sri_service_assessments`.
