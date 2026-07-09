# Audit Data Model

> Model danych Universal Audit Engine. Etap projektowy — propozycja schematu (nie migracja).
> Konwencja spójna z istniejącym schematem SRI (`sri_*`) i Methodology Version Engine.
> Prefiks tabel: `audit_*`. Klucze: `uuid`. Znaczniki czasu: `timestamptz`.

Powiązane: `UNIVERSAL_AUDIT_ENGINE.md`, `AUDIT_EXECUTION_FLOW.md`, `AUDIT_PLUGIN_ARCHITECTURE.md`, `AUDIT_LIFECYCLE.md`.

---

## 1. Mapa encji

```
audit_template_family
   └─ audit_template (wersjonowany)              ── methodology_version_id ─▶ sri_methodology_versions
        ├─ audit_section (drzewo)
        │     └─ audit_question
        │           ├─ audit_question_option
        │           ├─ audit_validation
        │           ├─ audit_dependency_rule
        │           └─ audit_evidence_requirement
        └─ audit_rule (scoring/blocker/warning/recommendation)

audit_session  ── template_id ─▶ audit_template     ── subject ─▶ (projekt/budynek)
   ├─ audit_answer      ── question_id ─▶ audit_question
   │     └─ audit_evidence
   ├─ audit_calculation_result
   ├─ audit_recommendation   ─▶ Recommendation Engine
   ├─ audit_roadmap          ─▶ Optimization Engine
   ├─ audit_report
   └─ audit_event (ścieżka audytowa)

audit_i18n (tłumaczenia dla dowolnej encji/pola)
```

---

## 2. Warstwa DEFINICJI

### 2.1 `audit_template_family`
Rodzina szablonów (stabilny identyfikator ponad wersjami).

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| code | text unique | np. `SRI`, `EPBD`, `ESG`, `WELL`, `LEED`, `BREEAM`, `SERVICE_AUDIT` |
| methodology_type | text | typ metodologii |
| default_language | text | np. `pl` |
| supported_languages | text[] | np. `{pl,en,de}` |
| created_at | timestamptz | |

### 2.2 `audit_template` (wersjonowany)
Konkretna wersja kwestionariusza.

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| family_id | uuid FK | → `audit_template_family` |
| version | text | np. `1.0` |
| methodology_version_id | uuid FK | → `sri_methodology_versions` (scoring/wagi) |
| calculation_strategy | text | id strategii (override lub z metodologii) |
| status | text | `draft` / `active` / `deprecated` / `archived` |
| inherits_from | uuid FK null | dziedziczenie z wcześniejszej wersji szablonu |
| valid_from / valid_to | timestamptz | okres obowiązywania |
| source_checksum | text | hash źródła definicji |
| template_checksum | text | sha256 znormalizowanej treści szablonu |
| config | jsonb | parametry specyficzne (np. progi, tryby) |
| created_at | timestamptz | |

### 2.3 `audit_section`
Sekcje (drzewo — obsługa zagnieżdżeń, np. kategoria → podkategoria).

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK | |
| parent_section_id | uuid FK null | zagnieżdżenie |
| code | text | np. `heating` (mapowanie na domenę SRI) |
| domain_ref | text null | referencja do domeny metodologii |
| sort_order | int | |
| weight | numeric null | opcjonalna waga sekcji (metodologie punktowe) |
| visible_when | jsonb null | wyrażenie warunkowej widoczności sekcji |

### 2.4 `audit_question`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| section_id | uuid FK | |
| code | text | np. `H-1a` (usługa SRI) |
| answer_type | text | patrz enum `answer_type` |
| required | bool | pytanie obowiązkowe |
| multi | bool | dozwolone wiele odpowiedzi (dla choice) |
| unit | text null | jednostka (np. `°C`, `kWh`, `ppm`) |
| min_value / max_value | numeric null | granice dla `number`/`measurement` |
| allowed_range | jsonb null | zakres/enum dozwolonych wartości |
| default_value | jsonb null | |
| maps_to | jsonb null | mapowanie na wejście metodologii (np. `{service:"H-1a", target:"functionality_level"}`) |
| scoring_hint | jsonb null | wskazówka dla Rules/Calculation |
| sort_order | int | |
| source_type | text | `official_methodology` / `engineering_assumption` |

### 2.5 `audit_question_option`
Opcje dla `single_choice` / `multi_choice` (np. poziomy FL 0..4).

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK | |
| value | text | wartość kanoniczna (np. `0`,`1`,`2`) |
| sort_order | int | |
| maps_to_value | jsonb null | np. FL=2 → wejście do scoringu |

### 2.6 `audit_validation`
Reguły walidacji pojedynczego pytania (lub cross-field).

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK null | null = walidacja cross-field na poziomie sekcji/sesji |
| type | text | `required` / `range` / `min` / `max` / `regex` / `evidence_count` / `cross_field` / `gps_present` / `signature_present` |
| params | jsonb | parametry (np. `{min:16,max:30}`, `{min_photos:1}`) |
| severity | text | `info` / `warning` / `error` / `critical` / `blocker` |
| message_key | text | klucz i18n komunikatu |

### 2.7 `audit_dependency_rule`
Logika warunkowa / zależności / pomijanie.

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK | pytanie docelowe (na które reguła wpływa) |
| condition | jsonb | wyrażenie nad odpowiedziami (patrz sekcja 6) |
| action | text | `show` / `hide` / `require` / `optional` / `skip` / `set_option` / `branch` / `prefill` |
| action_params | jsonb null | np. które opcje odblokować |
| source_type | text | `official_methodology` / `engineering_assumption` |

### 2.8 `audit_evidence_requirement`
Wymagane dowody dla pytania.

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| question_id | uuid FK | |
| evidence_type | text | patrz enum `evidence_type` |
| min_count | int | minimalna liczba dowodów |
| required_when | jsonb null | warunek (np. tylko dla FL ≥ 3) |
| description_key | text | klucz i18n |

### 2.9 `audit_rule` (Rules Engine — poziom metodologii/szablonu)

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK | |
| rule_type | text | `scoring` / `validation` / `recommendation` / `blocker` / `critical` / `warning` |
| scope | text | `question` / `section` / `global` |
| expression | jsonb | warunek uruchomienia |
| output | jsonb | efekt (np. flaga, komunikat, wywołanie strategii) |
| severity | text null | dla walidacji/blokerów |
| source_type | text | provenance |

---

## 3. Warstwa WYKONANIA

### 3.1 `audit_session`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| template_id | uuid FK | konkretna wersja szablonu (przypięta) |
| template_checksum | text | snapshot checksumu szablonu (audytowalność) |
| methodology_version_id | uuid FK | snapshot wersji metodologii |
| subject_type | text | `project` / `building` / `device` / `order` |
| subject_id | uuid | referencja do obiektu audytu |
| auditor_id | uuid | wykonawca |
| language | text | język sesji |
| status | text | patrz `AUDIT_LIFECYCLE.md` |
| context | jsonb | np. `{building_type, climate_zone}` — wejście do obliczeń |
| progress | jsonb | `{answered, required_total, evidence_missing}` |
| started_at / completed_at | timestamptz null | |
| created_at | timestamptz | |

### 3.2 `audit_answer`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| question_id | uuid FK | |
| value | jsonb | wartość typowana wg `answer_type` |
| normalized_value | jsonb null | znormalizowana (jednostki SI, wartość kanoniczna) |
| unit | text null | |
| is_skipped | bool | pominięte przez logikę zależności |
| status | text | `answered` / `uncertain` / `needs_verification` / `not_applicable` |
| confidence | numeric null | 0..1 (przydatne dla AI-assist) |
| source | text | `manual` / `device` / `import` / `ai_suggested` |
| answered_by | uuid | |
| answered_at | timestamptz | |

### 3.3 `audit_evidence`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| answer_id | uuid FK null | null = dowód na poziomie sesji |
| evidence_type | text | patrz enum |
| storage_ref | text | ścieżka w buckecie (Supabase Storage) |
| filename | text | |
| mime | text | |
| file_hash | text | sha256 pliku (integralność) |
| gps | jsonb null | `{lat,lng,accuracy}` |
| captured_at | timestamptz null | |
| verified | bool | zweryfikowano ręcznie/AI |
| verified_by | uuid null | |
| notes_key | text null | |

---

## 4. Warstwa OCENY i PREZENTACJI

### 4.1 `audit_calculation_result`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| calculation_strategy | text | użyta strategia |
| engine_version | text | wersja silnika liczącego |
| inputs_snapshot | jsonb | wejścia (mapowane odpowiedzi + kontekst) |
| result | jsonb | wynik: per-service, per-domain, total_score, class |
| warnings | jsonb | ostrzeżenia obliczeniowe |
| computed_at | timestamptz | |

### 4.2 `audit_recommendation`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| ref | text | id rekomendacji z Recommendation Engine |
| gap | jsonb | opis braku |
| priority | text | `Critical` / `High` / `Medium` / `Low` |
| expected_gain | numeric | oczekiwany wzrost wyniku |
| dependencies | jsonb | wymagane wcześniej capability |
| status | text | `proposed` / `accepted` / `rejected` / `done` |

### 4.3 `audit_roadmap`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| stages | jsonb | etapy 1–5 z gainem, akcjami, pakietami (Optimization Engine) |
| generated_at | timestamptz | |

### 4.4 `audit_report`

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| format | text | `pdf` / `json` / `dashboard` |
| storage_ref | text null | dla pdf/json |
| payload | jsonb null | kanoniczny wynik (dla api/dashboard) |
| checksum | text | integralność raportu |
| published | bool | |
| generated_at | timestamptz | |

### 4.5 `audit_event` (ścieżka audytowa)

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| event_type | text | `status_change` / `answer_set` / `evidence_added` / `validated` / `approved` / ... |
| actor_id | uuid | |
| payload | jsonb | szczegóły (old/new) |
| created_at | timestamptz | |

---

## 5. Wielojęzyczność — `audit_i18n`

Uniwersalna tabela tłumaczeń (klucz zamiast tekstu w encjach definicji).

| Kolumna | Typ | Opis |
|---|---|---|
| id | uuid PK | |
| entity_type | text | `template` / `section` / `question` / `option` / `validation` / `evidence_req` |
| entity_id | uuid | |
| field | text | np. `title`, `text`, `help_text`, `message` |
| language | text | `pl` / `en` / ... |
| value | text | przetłumaczony tekst |

Zasada: encje definicji trzymają `*_key`; treść w `audit_i18n`. Fallback do `default_language`.

---

## 6. Enumy

**`answer_type`** (typy odpowiedzi z zadania):
`yes_no` · `number` · `text` · `single_choice` · `multi_choice` · `photo` · `document` ·
`gps` · `signature` · `measurement` · `device_reading`

**`evidence_type`**:
`photo` · `pdf` · `video` · `log` · `bms_export` · `screenshot` · `documentation`

**`severity`**: `info` · `warning` · `error` · `critical` · `blocker`

**`rule_type`**: `scoring` · `validation` · `recommendation` · `blocker` · `critical` · `warning`

**`session_status`**: `draft` · `started` · `in_progress` · `waiting_for_evidence` ·
`completed` · `validated` · `approved` · `archived` (patrz `AUDIT_LIFECYCLE.md`)

**`answer_status`**: `answered` · `uncertain` · `needs_verification` · `not_applicable`

**`source_type`**: `official_methodology` · `engineering_assumption`

---

## 7. Format wyrażeń (condition / expression)

Wyrażenia (widoczność, walidacja, zależności) jako JSON — deklaratywne, bez eval kodu:

```json
{ "op": "and", "args": [
    { "op": "eq",  "question": "H-system-present", "value": "yes" },
    { "op": "gte", "question": "H-1a", "value": 3 }
]}
```

Operatory: `eq, ne, gt, gte, lt, lte, in, not_in, exists, and, or, not`.
Referencje: `question` (po `code`), `context` (np. `context.building_type`),
`answer_count`, `evidence_count`. Silnik ewaluuje bezpiecznie (whitelist operatorów).

---

## 8. Wersjonowanie i integralność

- **Template** dziedziczy przez `inherits_from` i ma `template_checksum` (jak `MethodologyVersion`).
- **Session** przypina `template_id` + `template_checksum` + `methodology_version_id`
  → wynik jest odtwarzalny nawet po publikacji nowszej wersji szablonu.
- Zmiana szablonu/metodologii dla trwających sesji: **nie mutuje** ich; migracja świadoma
  z użyciem `MethodologyDiff` (patrz Methodology Version Engine).

---

## 9. Bezpieczeństwo (założenia RLS — do wdrożenia)

- Definicje (`audit_template*`, `audit_section`, `audit_question*`, `audit_rule`): SELECT publiczny/uwierzytelniony, zapis tylko rola serwisowa/admin.
- Sesje i odpowiedzi: dostęp wg właściciela/roli (auditor, klient, admin).
- Evidence w Supabase Storage z podpisanymi URL; hash pliku w rekordzie.
