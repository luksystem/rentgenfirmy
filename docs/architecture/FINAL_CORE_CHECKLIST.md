# Final Core Checklist

> Lista kontrolna zamknięcia fundamentu platformy Rentgen. Stan: po implementacji warstwy
> infrastrukturalnej (Artifact Versioning, Schema Contracts, Orchestrator, Seed Engine, Validation).
> Wszystkie pozycje zweryfikowane uruchomieniem realnego kodu.

Legenda: ✅ zrobione i zweryfikowane · ⏭️ additywne (wiring runtime, nie dotyczy fundamentu).

---

## 1. Artifact Versioning

| # | Element | Status | Dowód |
|---|---|---|---|
| 1.1 | Wersjonowanie artefaktów (`generated/<methodology_version_id>/`) | ✅ | 22 artefakty w `generated/eu-sri-v4.5/` |
| 1.2 | Współistnienie wielu wersji | ✅ | layout per wersja + macierz zgodnosci (5 wersji) |
| 1.3 | Checksum/hash | ✅ | `payload_checksum` (sha256) w każdej kopercie |
| 1.4 | Provenance | ✅ | naglowek `provenance` (artifact_type, wersja, źródło, engine, data) |
| 1.5 | Compatibility matrix | ✅ | `generated/compatibility-matrix.json` |
| 1.6 | Migration strategy | ✅ | `inherits_from` + `migration_from` + Methodology Diff |

Implementacja: `store/SRI/core/provenance.py`, `store/SRI/core/artifacts.py`.

---

## 2. Schema Contracts

| # | Element | Status | Dowód |
|---|---|---|---|
| 2.1 | JSON Schema dla głównych artefaktów | ✅ | `schemas/*.json` (envelope, provenance, assessment-input, calculation-result, compatibility-matrix, seed-manifest) |
| 2.2 | Walidacja zgodności | ✅ | walidator stdlib `jsonschema_mini.py`; 24 koperty PASS |
| 2.3 | Compatibility checks | ✅ | walidacja macierzy + kopert w Final Validation |
| 2.4 | Semver | ✅ | `schema_version` / `engine_version` z wzorcem `^\d+\.\d+\.\d+$` |
| 2.5 | Deprecation policy | ✅ | `status` (active/draft/deprecated/archived) + ADR-008 |

Implementacja: `store/SRI/core/jsonschema_mini.py`, `schemas/`.

---

## 3. Orchestrator

| # | Element | Status | Dowód |
|---|---|---|---|
| 3.1 | Warstwa orkiestracji 6 silników | ✅ | `store/SRI/core/orchestrator.py` (DAG) |
| 3.2 | Kolejność wykonania | ✅ | methodology/knowledge ∥ dependency→recommendation→optimization→package→matrix→seed |
| 3.3 | Lifecycle | ✅ | kroki z jawnym stanem + raport konsolowy |
| 3.4 | Pipeline | ✅ | uruchomiony end-to-end (ORKESTRACJA ZAKONCZONA) |
| 3.5 | Error handling | ✅ | błąd kroku przerywa pipeline, exit≠0, brak publikacji |
| 3.6 | Rollback | ✅ | staging + atomic swap; błąd walidacji → odrzucenie staging |
| 3.7 | Cache strategy | ✅ | checksum wejść w `generated/.cache/`; `[skip]` gdy bez zmian |

---

## 4. Seed Engine

| # | Element | Status | Dowód |
|---|---|---|---|
| 4.1 | Transakcyjny import | ✅ | `BEGIN; ... COMMIT;` jeden plik `supabase/seed/eu-sri-v4.5/seed.sql` |
| 4.2 | Idempotentność | ✅ | uuid5 deterministyczne + `ON CONFLICT DO NOTHING` |
| 4.3 | Rollback | ✅ | `RAISE` w bloku → rollback całej transakcji |
| 4.4 | Partial import recovery | ✅ | transakcja = all-or-nothing; ponowny run bezpieczny |
| 4.5 | Walidacja przed importem | ✅ | preflight: checksum kopert + niepuste zbiory |
| 4.6 | Manifest | ✅ | `generated/eu-sri-v4.5/seed-manifest.json` (row_counts) |

Row counts (zweryfikowane): services 54 · FL 228 · impact_scores 1596 · domain_weights 630 · criterion_weights 14.
Zastępuje ręczny split na 8 chunków (dług D7).

---

## 5. Final Core Validation

| # | Kontrola | Status |
|---|---|---|
| 5.1 | Schemat envelope akceptuje/odrzuca poprawnie | ✅ |
| 5.2 | Integralność 24 kopert (checksum + schemat) | ✅ |
| 5.3 | Macierz zgodności zgodna ze schematem | ✅ |
| 5.4 | Manifest seeda zgodny ze schematem + niepuste liczby | ✅ |
| 5.5 | AssessmentInput (realny) zgodny ze schematem + walidacją silnika | ✅ |
| 5.6 | CalculationResult (realny wynik silnika) zgodny ze schematem | ✅ |
| 5.7 | Determinizm silnika (2× te same wejścia) | ✅ |

Raport: `generated/FINAL_CORE_VALIDATION.json` → `all_passed: true`.
Implementacja: `store/SRI/core/final_validation.py`.

---

## 6. Weryfikacja (jak odtworzyć)

```
python store/SRI/core/orchestrator.py         # pełny build + publikacja + seed
python store/SRI/core/orchestrator.py --force # wymuś przeliczenie (ignoruj cache)
python store/SRI/core/final_validation.py     # bramka walidacji fundamentu
```

---

## 7. Pozostałe (additywne, NIE dotyczą fundamentu)

| # | Zadanie | Charakter |
|---|---|---|
| ⏭️ 7.1 | Zastosować `seed.sql` na środowisku Supabase | operacyjne |
| ⏭️ 7.2 | Migracja `audit_*` (schemat wykonania audytu) | wdrożenie modelu |
| ⏭️ 7.3 | Port strategii liczenia do runtime lub usługa licząca | wiring |
| ⏭️ 7.4 | Abstrakcja `KnowledgeSearch` (FTS→hybrid) — interfejs | rozwojowe |

Żadna z tych pozycji nie wymaga przebudowy fundamentu — są to kroki wdrożeniowe budowane
NA fundamencie. Szczegóły w `FOUNDATION_COMPLETE.md`.
