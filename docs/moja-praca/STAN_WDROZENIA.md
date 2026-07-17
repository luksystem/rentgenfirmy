# Stan wdrożenia — Moja praca

Ostatnia aktualizacja: moduł Czas pracy (etapy 1–6).

## Etap 1 — Zadania (MVP) ✅

| Element | Status |
|---------|--------|
| Migracje `120`–`122` | ✅ |
| Tabela `work_items` + workflow | ✅ |
| Adapter `manual` + `kanban_task` | ✅ |
| Store + hydrator | ✅ |
| UI Lista / Kanban | ✅ |
| API CRUD + workflow (send, accept, complete, verify) | ✅ |
| Powiadomienia podstawowe | ✅ |

## Etap 2 — Plany i rytm dnia ✅

| Element | Status |
|---------|--------|
| Migracja `123_my_work_plans.sql` | ✅ |
| `work_plans`, `work_plan_items`, `work_day_sessions` | ✅ |
| `work_obstacles`, `work_summaries` | ✅ |
| UI: Rozpoczynam dzień, Podsumuj dzień | ✅ |
| UI: Plan tygodnia (manager + potwierdzenie) | ✅ |
| Zgłaszanie przeszkód | ✅ |

## Etap 3 — Agregacja modułów ✅

| Element | Status |
|---------|--------|
| Migracja `124_my_work_source_types.sql` | ✅ |
| Adaptery: process, serwis, ustalenia, przeglądy, plan zasobów, funkcjonalność | ✅ |
| `syncAllWorkItemSources()` | ✅ |
| Edycja / anulowanie / usuwanie (manager/admin) | ✅ |
| Prośba o przejęcie zadania + powiadomienie | ✅ |

## Etap 4 — AI sugestie i ryzyka ✅

| Element | Status |
|---------|--------|
| `lib/ai/my-work-ai.ts` (OpenAI + fallback reguł) | ✅ |
| API: `/api/my-work/ai/day-summary` | ✅ |
| API: `/api/my-work/ai/suggest-tasks` (manager) | ✅ |
| API: `/api/my-work/ai/analyze-risks` | ✅ |
| UI: „Wygeneruj szkic AI” w podsumowaniu dnia | ✅ |
| UI: panel sugestii w „Nowe zadanie” | ✅ |
| UI: „Analiza ryzyk AI” przy potwierdzaniu planu tygodnia | ✅ |
| Flagi `ai_generated`, `ai_suggestion_reason`, `ai_draft` | ✅ |
| Filtr „Sugestie AI” w liście zadań | ✅ |

## Etap 5 — Pulpit managera ✅

| Element | Status |
|---------|--------|
| `lib/my-work/dashboard-metrics.ts` | ✅ |
| `lib/supabase/my-work-dashboard-server.ts` | ✅ |
| API: `GET /api/my-work/dashboard` | ✅ |
| Strona `/moja-praca/pulpit` | ✅ |
| Nawigacja „Pulpit” w menu Moja praca | ✅ |
| KPI: zaległe, weryfikacja, przeszkody, obciążenie zespołu | ✅ |

## Czas pracy — `/moja-praca/czas-pracy` ✅

| Element | Status |
|---------|--------|
| Migracja `125` — wpisy, kategorie, typy, timer | ✅ |
| Ewidencja + timer + walidacja nakładania | ✅ |
| Arkusz tygodniowy / miesięczny + akceptacja | ✅ |
| Macierz zespołu dzień-po-dniu + rozbicie projektów | ✅ |
| Saldo godzin (norma vs praca) | ✅ |
| Sync urlopów → wpisy (`154`) | ✅ |
| Oznaczenia weekendów / świąt / urlopów w macierzy | ✅ |
| Propozycje z planu zasobów (`159`) | ✅ |
| Budżet godzin vs kontrakt (`project_contract_quotas`) | ✅ |
| Misje / delegacje (`160`, `work_missions`) | ✅ |
| Snapshot stawek koszt / klient (`161`, profil + billing) | ✅ |
| Backfill urlopów: `POST /api/time-tracking/leave-backfill` | ✅ |

**Adresy:**
- Ewidencja: `/moja-praca/czas-pracy`
- Arkusz: `/moja-praca/czas-pracy/arkusz`

## Poza zakresem (roadmapa)

| Element | Status |
|---------|--------|
| UI zarządzania misjami (CRUD) | 🔲 |
| AI / anomalie w czasie pracy | 🔲 |
| Realtime na pulpicie managera | 🔲 opcjonalnie |

## Checklist po deploy

- [ ] Migracje `120`–`124`, `125`, `154`, `159`–`161` na produkcji
- [ ] `OPENAI_API_KEY` w env (opcjonalnie, dla pełnego AI)
- [ ] Test manualny wg [TEST_RECZNY.md](./TEST_RECZNY.md)
