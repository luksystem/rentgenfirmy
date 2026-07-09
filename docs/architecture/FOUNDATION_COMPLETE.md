# Foundation Complete

> Deklaracja zamknięcia fundamentu platformy audytowej Rentgen (warstwa offline / kontrakty /
> orkiestracja / seed / walidacja). Dokument odpowiada na pytania z zadania i wskazuje granicę
> między „fundamentem" a „wdrożeniem NA fundamencie".

---

## 1. Co zostało zamknięte

Zaimplementowano i **uruchomiono end-to-end** kompletną warstwę infrastrukturalną:

```
store/SRI/core/
  provenance.py        # kanoniczny checksum + koperta artefaktu (provenance header)
  jsonschema_mini.py   # walidator JSON Schema (stdlib, bez zależności)
  artifacts.py         # pakowanie -> generated/<version>/ + macierz zgodności + indeks
  seed_engine.py       # transakcyjny, idempotentny seed + manifest + preflight
  orchestrator.py      # DAG 6 silników + staging + atomic swap + cache + rollback
  final_validation.py  # agregacja kontroli + parytet/kontrakty z realnym silnikiem
schemas/*.json         # kontrakty (envelope, provenance, assessment-input, calculation-result, ...)
generated/<version>/   # WERSJONOWANE artefakty w kopertach z checksumami
supabase/seed/<version>/seed.sql  # jeden transakcyjny plik importu
```

Dowód działania: `orchestrator.py` publikuje 22 artefakty, buduje macierz (5 wersji),
generuje seed (54/228/1596/630/14 wierszy); `final_validation.py` → **all_passed: true**.

Architektura warstwowa (offline → runtime) opisana w `FINAL_CORE_ARCHITECTURE.md`; niniejszy
dokument potwierdza jej realizację i domknięcie kontraktów.

---

## 2. Odpowiedzi na pytania

### Pytanie 1 — Czy architektura jest gotowa na: SRI, EPBD, EN ISO 52120, WELL, LEED, BREEAM, własne metodologie?

**Tak — architektonicznie na wszystkie.** Fundament jest metodologicznie neutralny: silnik nie
zna „SRI", tylko czyta katalog przez `CatalogueRepository` i liczy według strategii przypisanej
do wersji metodologii. Poziom gotowości różni się rodzajem matematyki wyniku:

| Metodologia | Rodzina obliczeń | Gotowość fundamentu | Co potrzeba dla uruchomienia |
|---|---|---|---|
| **SRI** | ważona renormalizacja domen×kryteria | ✅ **udowodnione** (54 usługi, 6 scenariuszy) | nic — działa |
| **EN ISO 52120** | ta sama rodzina co SRI (wspólny rodowód normatywny) | ✅ | katalog + rejestracja wersji (dane) |
| **EPBD** | wskaźniki + progi klas | ✅ | katalog + template + progi (dane) |
| **WELL / LEED / BREEAM** | suma punktów kredytowych + progi certyfikatu | ✅ | **jednorazowa** strategia „credit-sum" + dane |
| **Własne (Luksystem, audyt serwisowy, odbiór)** | dowolne (checklist/scoring) | ✅ | template + dane; strategia z rejestru |

Kluczowe: różnica to **dane + konfiguracja + ewentualnie 1 pluginowa strategia liczenia**,
nigdy przebudowa rdzenia, orkiestratora, seeda ani schematów.

### Pytanie 2 — Czy dodanie nowej metodologii będzie wymagało zmian w kodzie?

**Dla metodologii z istniejącej rodziny obliczeń (SRI/ISO/EPBD/checklist) — NIE.**
Wymaga wyłącznie: artefaktów katalogu, wpisu wersji w rejestrze metodologii, szablonu audytu
oraz (dla seeda) jednego wpisu mapowania w `VERSION_DB_MAP`. To dane/konfiguracja.

**Dla metodologii z zupełnie nową matematyką wyniku** (np. pierwsza metodologia typu
„credit-sum" jak LEED) — potrzebna jest **jedna nowa, pluginowa `CalculationStrategy`**,
zarejestrowana w rejestrze strategii. To dodanie pluginu, **nie** zmiana rdzenia — reszta
platformy (versioning, schematy, orchestrator, seed, walidacja) pozostaje nietknięta.
Każdą kolejną metodologię tej samej rodziny obsłużą już same dane.

> Zasada: **data-first, code-second.** Kod dokładamy tylko dla nowej *klasy algorytmu*, raz.

### Pytanie 3 — Czy aktualizacja metodologii będzie polegała wyłącznie na imporcie nowych artefaktów?

**Aktualizacja istniejącej metodologii (np. SRI v4.5 → v5.0) — TAK.**
Ścieżka: nowe pliki źródłowe → `orchestrator.py` (build + provenance + walidacja schematami) →
nowy katalog `generated/<nowa-wersja>/` (stary zostaje do porównań) → `seed.sql` nowej wersji
(nowy `catalogue_code`, idempotentnie). Zero zmian w kodzie. Methodology Diff pokazuje różnice
między wersjami. Compatibility matrix rejestruje `inherits_from`/`migration_from`.

Zastrzeżenie uczciwe: dla **całkiem nowego typu** metodologii pierwszy import dokłada też wpis
w rejestrze i (jednorazowo, jeśli nowa rodzina) strategię liczenia — patrz Pytanie 2.

### Pytanie 4 — Czy fundament można uznać za zamknięty?

**Tak — warstwa fundamentu (infrastruktura platformy) jest ZAMKNIĘTA.**
Zamknięte i zweryfikowane: kontrakty danych (frozen), wersjonowanie + provenance + checksumy,
walidacja schematami, orkiestracja z rollbackiem i cache, transakcyjny idempotentny seed,
bramka Final Validation. Rdzeń jest metodologicznie neutralny i deterministyczny.

Nie znaleziono elementów wymagających **przebudowy**. Pozostałe zadania są **additywne** i
budowane NA fundamencie (patrz §3) — nie otwierają go ponownie.

---

## 3. Granica: co pozostaje (additywne, nie „fundament")

| Zadanie | Dlaczego to nie przebudowa |
|---|---|
| Zastosowanie `seed.sql` na Supabase | operacja wdrożeniowa; artefakt gotowy |
| Migracja tabel `audit_*` (wykonanie audytu) | realizacja zaprojektowanego modelu (`docs/audit/AUDIT_DATA_MODEL.md`) |
| Runtime liczenia (port strategii lub usługa) | kontrakty `AssessmentInput`/`CalculationResult` są frozen — runtime tylko je konsumuje |
| Abstrakcja `KnowledgeSearch` (FTS → hybrid) | interfejs stały; implementacja wymienna |
| UI / API / formularze | warstwa prezentacji nad gotowymi kontraktami |

---

## 4. Sign-off

- Rdzeń metodologicznie neutralny: **tak** (`CatalogueRepository`, brak hardkodów SRI w silniku).
- Kontrakty zamrożone i walidowane realnym silnikiem: **tak**.
- Wersjonowanie + provenance + checksum + macierz zgodności: **tak**.
- Orkiestracja idempotentna z rollbackiem i cache: **tak**.
- Seed transakcyjny, idempotentny, z preflightem: **tak**.
- Final Validation zielona: **tak** (`generated/FINAL_CORE_VALIDATION.json`).

**Fundament zamknięty. Można rozpocząć implementację UI/API/formularzy oraz migracji `audit_*`.**
Decyzje projektowe: `ARCHITECTURE_DECISION_RECORDS.md`.
