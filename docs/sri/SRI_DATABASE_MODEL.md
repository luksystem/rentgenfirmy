# SRI — Model danych (Database Model)

Opis modelu bazy danych SRI zaimplementowanego w `supabase/migrations/096_sri_catalogue.sql`.
Odzwierciedla metodologię Delegated Regulation (EU) 2020/2155 + Implementing Reg. (EU) 2020/2156.

**Zasada nadrzędna:** dane referencyjne (katalog metodologii) są **wersjonowane** i **niemutowalne** w ramach jednej wersji. Nowa wersja SRI = nowe wiersze z nowym `catalogue_code`, stare zostają do porównań. Bez UI, bez formularzy — to warstwa danych.

---

## 1. Diagram zależności (logiczny)

```
sri_methodology_versions (1)
├── sri_source_imports            (proweniencja importu: hashe, wersje)
├── sri_catalogues                (Method A / B, locale)  ── source_import_id → sri_source_imports
├── sri_key_functionalities       (3: energia / potrzeby / elastyczność)
├── sri_technical_domains         (9: heating … monitoring_and_control)
├── sri_impact_criteria           (7)  ── key_functionality_id → sri_key_functionalities
├── sri_impact_criterion_weights  (W_f(ic): typ budynku × kryterium)
├── sri_domain_impact_weights     (W(d,ic): typ budynku × strefa × domena × kryterium)
└── sri_class_bands               (7 klas A–G)

sri_catalogues (1)
└── sri_services (54)             ── domain_id → sri_technical_domains
    └── sri_functionality_levels  (0–4 per usługa)
        └── sri_functionality_level_impact_scores  ── impact_criterion_id → sri_impact_criteria
```

---

## 2. Tabele

### 2.1 `sri_methodology_versions` — wersja metodologii
| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | uuid PK | |
| `code` | text UNIQUE | np. `eu-2020-2155-v1` |
| `legal_basis` | text | podstawa prawna |
| `effective_from` | date | data wejścia w życie |
| `supersedes_id` | uuid FK→self | poprzednia wersja |
| `status` | text | `draft` \| `active` \| `deprecated` |

### 2.2 `sri_source_imports` — proweniencja importu ⭐
Rdzeń mechanizmu aktualizowalności. Jeden wiersz na każdy import pakietu KE.
| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | uuid PK | |
| `methodology_version_id` | uuid FK | |
| `source_version` | text | np. `SRI calculation sheet v4.5` |
| `source_filename` | text | nazwa pliku Excel |
| `source_role` | text | `primary_dataset` \| `practical_guide` |
| `import_hash` | text | **SHA-256 pliku Excel** (zmiana pliku) |
| `source_size_bytes` | bigint | |
| `source_checksum` | text | **SHA-256 znormalizowanych danych** (zmiana danych) |
| `importer_version` | text | wersja skryptu ekstrahującego |
| `import_date` | date | |
| `record_counts` | jsonb | liczniki do diffu wersji |
| `notes` | text | |
| `imported_at` | timestamptz | |

### 2.3 `sri_catalogues` — katalog usług
| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | uuid PK | |
| `methodology_version_id` | uuid FK | |
| `code` | text | np. `eu-method-b-2020-v4.5` |
| `method` | text | `A` \| `B` \| `national` |
| `locale` | text | domyślnie `en` |
| `service_count` | int | |
| `source_import_id` | uuid FK→sri_source_imports | z jakiego importu pochodzi |
| UNIQUE | (methodology_version_id, code) | |

### 2.4 `sri_key_functionalities` — 3 kluczowe funkcjonalności
`code`, `sort_order`, `name` jsonb (`{en, pl}`), `description` jsonb. UNIQUE (version, code).

### 2.5 `sri_technical_domains` — 9 domen technicznych
`code`, `sort_order`, `name` jsonb, `description` jsonb, `source_document`. UNIQUE (version, code).

### 2.6 `sri_impact_criteria` — 7 kryteriów oddziaływania
`code`, `sort_order`, `name` jsonb, `key_functionality_id` FK. UNIQUE (version, code).

### 2.7 `sri_services` — katalog usług (54 Method B)
| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | uuid PK | |
| `catalogue_id` | uuid FK | |
| `domain_id` | uuid FK | |
| `official_code` | text | z arkusza KE, np. `H-1a` |
| `internal_code` | text | stabilny kod Rentgen, np. `H-01` |
| `sort_order` | int | |
| `official_name` | jsonb | `{en, pl}` |
| `service_group` | text | grupa usług |
| `purpose`, `when_applicable` | jsonb | pola kuratorskie (RECONSTRUCTED) |
| `typical_devices` | text[] | pole kuratorskie |
| `preconditions` | text | triage/uwagi z arkusza |
| `fl_max` | smallint | maks. poziom funkcjonalności |
| `included_in_method_a` | boolean | |
| `included_in_method_b` | boolean | |
| `triage_affects_max` | boolean | |
| `applicability_mode` | text | `smart_ready` \| `smart_possible` |
| `mutual_exclusion_group` | text | |
| `standards_basis` | text[] | |
| `provenance` | text | `VERIFIED_ANNEX_D` |
| UNIQUE | (catalogue_id, official_code) | |

### 2.8 `sri_functionality_levels` — poziomy funkcjonalności
`service_id` FK, `level_number` (0–4), `official_description` jsonb, `practical_description` jsonb. UNIQUE (service_id, level_number).

### 2.9 `sri_functionality_level_impact_scores` — macierz punktów
PK złożony: (`functionality_level_id`, `impact_criterion_id`). `score` smallint.
⚠️ **Bez CHECK ≥ 0** — metodologia dopuszcza wartości ujemne.

### 2.10 `sri_impact_criterion_weights` — wagi kryteriów `W_f(ic)`
`impact_criterion_id` FK, `building_type` (`residential`/`non_residential`), `weight` numeric (ułamek, Σ=1 per typ). UNIQUE (version, criterion, building_type).

### 2.11 `sri_domain_impact_weights` — wagi domen `W(d,ic)`
`domain_id` FK, `impact_criterion_id` FK, `building_type`, `climate_zone`, `weight` numeric (ułamek, Σ po domenach = 1 per kryterium). UNIQUE (version, domain, criterion, building_type, climate_zone).

### 2.12 `sri_class_bands` — klasy SRI (Annex VIII)
`class_number` (1–7), `label` (A–G), `score_min_percent`, `score_max_percent`. UNIQUE (version, class_number).

---

## 3. Decyzje projektowe

- **Wagi jako ułamki 0..1** (nie procenty) — zgodnie z arkuszem KE, `numeric` bez stałej skali (pełna precyzja ~15 cyfr).
- **Punkty jako smallint bez ograniczenia znaku** — dozwolone wartości ujemne.
- **Nazwy dwujęzyczne w jsonb** (`{en, pl}`) zamiast osobnych tabel lokalizacji — prostsze, wystarczające.
- **Method A jako flaga** (`included_in_method_a`) na usłudze, nie osobne wiersze — 27 usług to podzbiór 54.
- **Wersjonowanie przez `catalogue_code`** — v5.0 tworzy nowy katalog obok v4.5.

---

## 4. RLS

Wszystkie tabele `sri_*`: RLS włączone, polityka `SELECT USING (true)` (dane referencyjne do odczytu dla wszystkich). Brak polityk zapisu → zapis tylko przez `service_role` (seed/import). Klient nie może modyfikować katalogu.

---

## 5. Czego model świadomie **nie** zawiera (jeszcze)

- Tabel **oceny konkretnego budynku** (`sri_assessments`, `sri_assessment_answers`, wyniki `D`/`SR`) — to warstwa obliczeniowa, poza importem katalogu.
- Katalogu **krajowego PL** (Annex VI) — opcjonalny `catalogue: pl-national`.
- `W_f` (wagi całkowite kluczowych funkcjonalności) jako osobna tabela — obecnie wynikają z `W_f(ic)`; do rozważenia przy silniku obliczeniowym.
