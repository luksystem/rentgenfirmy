# Architecture Decision Records (ADR)

> Rejestr decyzji architektonicznych fundamentu platformy Rentgen. Każdy rekord: kontekst →
> decyzja → konsekwencje → alternatywy. Status: Accepted, o ile nie zaznaczono inaczej.

Numeracja stała — nowe decyzje dopisujemy na końcu, istniejących nie renumerujemy.

---

## ADR-001 — Koperta artefaktu (Artifact Envelope) z nagłówkiem provenance

- **Status:** Accepted
- **Kontekst:** Artefakty (katalog, grafy, rekomendacje) były surowymi JSON-ami bez metadanych
  o pochodzeniu, wersji i integralności. Brak sposobu na wykrycie manipulacji i powiązanie z wersją.
- **Decyzja:** Każdy artefakt maszynowy pakujemy w kopertę `{ provenance, payload }`. Nagłówek
  zawiera `artifact_type`, `methodology_version_id`, `schema_version`, `engine_version`,
  `generated_by`, `generated_at`, `source_checksum`, `payload_checksum` (sha256 kanoniczny).
- **Konsekwencje:** Jednolity, samoopisujący się format; wykrywalność dryfu; łatwe wersjonowanie.
  `payload_checksum` liczony **wyłącznie z payloadu**, więc jest deterministyczny (zmiana
  `generated_at` go nie narusza).
- **Alternatywy:** metadane obok pliku (odrzucone — łatwe do rozjechania z treścią).

## ADR-002 — Kanoniczna serializacja jako podstawa checksumu

- **Status:** Accepted
- **Kontekst:** Checksum musi być stabilny niezależnie od kolejności kluczy i formatowania.
- **Decyzja:** `json.dumps(sort_keys=True, ensure_ascii=False, separators=(",", ":"))` → sha256.
- **Konsekwencje:** Powtarzalne hashe między maszynami/uruchomieniami; determinizm.

## ADR-003 — Wersjonowany layout `generated/<methodology_version_id>/`

- **Status:** Accepted
- **Kontekst:** Wiele wersji metodologii musi współistnieć (porównania, migracje, audyty historyczne).
- **Decyzja:** Publikacja artefaktów per wersja w `generated/<id>/`; stare wersje zostają.
  Granica offline↔runtime: `generated/**` to zamrożone kontrakty maszynowe (patrz `FINAL_CORE_ARCHITECTURE.md`).
- **Konsekwencje:** Współistnienie wersji; brak nadpisywania; naturalne wejście dla seeda i runtime.

## ADR-004 — Walidator JSON Schema w stdlib (bez zależności)

- **Status:** Accepted
- **Kontekst:** `jsonschema` niedostępny w środowisku; warstwa offline ma być stdlib-only
  (spójność z resztą skryptów SRI).
- **Decyzja:** Własny `jsonschema_mini.py` obsługujący podzbiór draft 2020-12
  (type, enum, const, required, properties, additionalProperties, patternProperties, items,
  min/max, pattern, allOf/anyOf/oneOf, `$ref` lokalny i plik-sąsiedni). Schematy piszemy w tym podzbiorze.
- **Konsekwencje:** Zero zależności; deterministyczna walidacja; świadome ograniczenie ekspresji schematów.
- **Alternatywy:** dołożyć `jsonschema` (odrzucone — niepotrzebna zależność dla prostych kontraktów).

## ADR-005 — Kontrakty ZAMROŻONE: AssessmentInput i CalculationResult

- **Status:** Accepted
- **Kontekst:** Runtime (API/UI) musi konsumować wynik silnika bez wiązania się z jego wnętrzem.
- **Decyzja:** Zamrażamy `assessment-input.schema.json` i `calculation-result.schema.json` jako
  granicę offline↔runtime. Final Validation sprawdza je **realnym wynikiem `compute_sri`**.
- **Konsekwencje:** Runtime niezależny od implementacji liczenia; kontrakt stabilny; zmiany tylko przez semver.

## ADR-006 — Orkiestracja jako DAG z cache i atomową publikacją

- **Status:** Accepted
- **Kontekst:** 6 silników z zależnościami; ryzyko częściowej/niespójnej publikacji.
- **Decyzja:** `orchestrator.py` uruchamia buildery w kolejności DAG z cache (checksum wejść),
  pakuje do **staging**, waliduje schematami i dopiero po sukcesie robi **atomic swap** do
  `generated/<version>/`. Błąd kroku przerywa pipeline (exit≠0) bez publikacji.
- **Konsekwencje:** Brak stanów pośrednich w produkcyjnym katalogu; szybkie re-buildy (skip);
  jasny rollback (odrzucenie staging).
- **Alternatywy:** budowa in-place (odrzucone — ryzyko częściowej publikacji).

## ADR-007 — Seed transakcyjny i idempotentny (jeden plik)

- **Status:** Accepted (zastępuje podejście z ADR-nieformalnym „split na 8 chunków")
- **Kontekst:** Wcześniej seed dzielono na 8 plików z powodu limitów edytora; ryzyko naruszeń FK
  między chunkami i braku atomowości.
- **Decyzja:** `seed_engine.py` generuje **jeden** `BEGIN; do $$ ... end $$; COMMIT;`. Idempotencja
  przez uuid5 (stały namespace zgodny z historią) + `ON CONFLICT DO NOTHING`. Preflight waliduje
  koperty i niepustość zbiorów przed generacją. Manifest z `row_counts` i checksumem.
- **Konsekwencje:** All-or-nothing (partial recovery gratis); bezpieczny ponowny import; brak
  problemu FK między chunkami. Nowa wersja SRI = nowy `catalogue_code`, stary zostaje.
- **Uwaga:** legacy `store/SRI/_gen_seed_sql.py` + `_split_seed.py` + `supabase/seed/096_chunks/`
  pozostają jako historyczne; nowy silnik jest kanoniczny.

## ADR-008 — Semver i polityka deprecacji artefaktów/metodologii

- **Status:** Accepted
- **Kontekst:** Potrzeba kontrolowanej ewolucji schematów i cyklu życia metodologii.
- **Decyzja:** `schema_version`/`engine_version` w semver (`MAJOR.MINOR.PATCH`). MAJOR = zmiana
  łamiąca kontrakt. Metodologie mają `status`: `active` → `deprecated` → `archived` (+ `draft`).
  `compatible_runtime` (np. `>=1.0.0 <2.0.0`) w macierzy zgodności wyznacza okno kompatybilności.
- **Konsekwencje:** Runtime może odrzucić niekompatybilny MAJOR; deprecacja bez usuwania danych.

## ADR-009 — Rdzeń metodologicznie neutralny (`CatalogueRepository`)

- **Status:** Accepted
- **Kontekst:** Przegląd architektury wykrył duplikację loaderów i hardkodowane stałe SRI
  (CRITERIA, KEY_FUNCTIONALITIES, ...) w wielu builderach.
- **Decyzja:** Jedno źródło prawdy `store/SRI/_common/catalogue.py` (`CatalogueRepository`),
  wyprowadzające stałe z danych katalogu. `sri_engine.py` refaktoryzowany, by z niego korzystać.
- **Konsekwencje:** Silnik nie zna „SRI"; nowa metodologia = nowe dane, nie nowy kod. Zweryfikowano
  brak regresji numerycznej (identyczne wyniki 6 scenariuszy przed/po).

## ADR-010 — Macierz zgodności jako artefakt platformowy

- **Status:** Accepted
- **Kontekst:** Potrzeba jednego, maszynowego widoku „która wersja z czym działa".
- **Decyzja:** `generated/compatibility-matrix.json` (koperta, `methodology_version_id="__platform__"`)
  agreguje wersje z rejestru metodologii + faktycznie opublikowane artefakty + `engine_version`,
  `compatible_runtime`, `inherits_from`, `migration_from`.
- **Konsekwencje:** Jedno miejsce prawdy o kompatybilności; wejście dla runtime i migracji.

## ADR-011 — Strategie liczenia jako plugin (data-first, code-second)

- **Status:** Accepted
- **Kontekst:** Różne metodologie mają różną matematykę wyniku (renormalizacja vs suma kredytów).
- **Decyzja:** Rodzina obliczeń = wymienna `CalculationStrategy` wskazywana przez wersję metodologii.
  Nową *klasę* algorytmu dodajemy raz jako plugin; kolejne metodologie tej rodziny to już tylko dane.
- **Konsekwencje:** Dodanie metodologii z istniejącej rodziny = 0 kodu; nowa rodzina = 1 plugin,
  bez ruszania rdzenia/orkiestratora/seeda/schematów. Podstawa odpowiedzi na Pytania 1–3 w `FOUNDATION_COMPLETE.md`.
