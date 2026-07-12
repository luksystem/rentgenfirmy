# Stan wdrożenia — Moja praca

Ostatnia aktualizacja: Etapy 1–5 (zadania + plany + agregacja + AI + pulpit).

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

**Uwaga:** Bez `OPENAI_API_KEY` działa fallback heurystyczny (reguły operacyjne).

## Etap 5 — Pulpit managera ✅

| Element | Status |
|---------|--------|
| `lib/my-work/dashboard-metrics.ts` | ✅ |
| `lib/supabase/my-work-dashboard-server.ts` | ✅ |
| API: `GET /api/my-work/dashboard` | ✅ |
| Strona `/moja-praca/pulpit` | ✅ |
| Nawigacja „Pulpit” w menu Moja praca | ✅ |
| KPI: zaległe, weryfikacja, przeszkody, obciążenie zespołu | ✅ |

## Poza zakresem (roadmapa)

| Element | Status |
|---------|--------|
| `/moja-praca/czas-pracy` | 🔲 placeholder w menu |
| Realtime na pulpicie managera | 🔲 opcjonalnie |
| Tabela audytu `work_ai_suggestions` | 🔲 opcjonalnie |

## Checklist po deploy

- [ ] Migracje `120`–`124` na produkcji
- [ ] `OPENAI_API_KEY` w env (opcjonalnie, dla pełnego AI)
- [ ] Test manualny wg [TEST_RECZNY.md](./TEST_RECZNY.md)
