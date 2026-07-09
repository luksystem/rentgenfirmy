# Backend Flow — MVP audytu SRI

> Warstwy serwerowe i przepływ danych. Bez UI. Node runtime (fs do artefaktów).

## Moduły

```
lib/audit/types.ts              typy domenowe + statusy + kontrakty (AssessmentInput/CalculationResult)
lib/sri/artifacts.ts           loader artefaktów generated/eu-sri-v4.5/** (cache modułowy)
lib/sri/engine.ts              compute() — port silnika SRI (parytet z Python)
lib/sri/recommendation.ts      buildRecommendations() — luki -> rekomendacje (z rankingiem)
lib/sri/optimization.ts        buildRoadmap() — rekomendacje -> 5 etapów + roadmap
lib/sri/report.ts              buildReport() — złożenie wyniku + rekomendacji + roadmapy
lib/supabase/audit-repository.ts   CRUD: sesje, odpowiedzi, evidence, wyniki (service role)
app/api/audit/**               endpointy REST (patrz API_SPEC.md)
```

## Przepływ danych (happy path)

1. **Create** — `audit-repository.createSession(userId, name)` → wiersz `audit_sessions` (status `draft`).
2. **Methodology** — zapis `methodology_version_id`, `building_type`, `climate_zone`; status `methodology_selected`.
3. **Questions** — `sri/artifacts.getCatalogue()` czyta `catalogue/services.json`; buduje listę pytań
   (usługa → poziomy 0..FLmax z opisami). Nie persystujemy pytań (deterministyczne z metodologii).
4. **Answers** — `audit-repository.upsertAnswers(sessionId, {code: level})`; status `in_progress`.
   Walidacja: kod usługi istnieje w katalogu, `0 <= level <= FLmax`.
5. **Evidence** — plik → bucket `audit-evidence` (`{sessionId}/{questionCode}/{uuid}`),
   metadana → `audit_evidence`.
6. **Run** (`POST /run`) — sekwencja w jednym żądaniu:
   1. Zbuduj `AssessmentInput` z odpowiedzi + kontekstu sesji.
   2. `engine.compute(input)` → `CalculationResult` (walidacja schematem po drodze).
   3. `recommendation.buildRecommendations(input, result)` → lista rekomendacji dla luk.
   4. `optimization.buildRoadmap(recommendations)` → etapy + roadmap.
   5. Zapis: `audit_results` (kind = `calculation` | `recommendation` | `optimization` | `roadmap`).
   6. status `completed`.
7. **Report** — `report.buildReport()` łączy wiersze `audit_results` w jeden obiekt; czysty odczyt.

## Silnik SRI (parytet)

Port 1:1 z `store/SRI/engine/sri_engine.py::compute_sri`:
- `achieved(d,ic)` / `maxposs(d,ic)` sumowane po usługach domeny,
- `SR(ic) = Σ_d W'(d,ic)·(achieved/maxposs)` z renormalizacją wag domen wnoszących wkład,
- `SRI = Σ_ic W_f(ic)·SR(ic)`, `%` = `SRI·100`,
- klasa wg progów `class-bands.json` (Annex VIII).
Determinizm + zgodność liczbowa weryfikowana testem parytetu.

## Idempotencja i błędy

- `/run` nadpisuje wiersze `audit_results` (upsert per kind) — powtórne uruchomienie bezpieczne.
- `/answers` upsert per `(session_id, question_code)`.
- Walidacja przed obliczeniem: brak metodologii/kontekstu lub pustych odpowiedzi → 400.
- Autoryzacja: `requireAuthenticatedProfile()` w każdym endpoincie; własność sesji sprawdzana po `owner_id`.

## Uwagi implementacyjne

- Artefakty czytane `fs`-em z `process.cwd()/generated/...` w runtime `nodejs`; cache w module.
- Tabele `audit_*` nie są jeszcze w `database.types.ts` → repo używa klienta service-role
  z lokalnym rzutowaniem typów (świadomy dług MVP; do regeneracji typów po migracji).
