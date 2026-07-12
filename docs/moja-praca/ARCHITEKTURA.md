# Architektura — Moja praca

## Cel

Moduł agreguje zadania operacyjne użytkownika jako **wewnętrzne zlecenia** (`work_items`), bez duplikowania danych źródłowych. Warstwa `work_items` obsługuje workflow: przyjęcie, realizacja, przeszkody, weryfikacja, plany dnia/tygodnia oraz wsparcie AI i pulpitu managera.

## Model danych

| Tabela | Rola |
|--------|------|
| `work_item_source_types` | Katalog typów źródeł (table-driven) |
| `work_items` | Koperta wewnętrznego zlecenia |
| `work_item_supporting_users` | Osoby wspierające |
| `work_item_acceptances` | Audyt przyjęcia zadania |
| `work_item_logs` | Historia aktywności |
| `work_item_comments` | Komentarze modułu |
| `work_item_attachments` | Załączniki (bucket `work-item-attachments`) |
| `work_plans` / `work_plan_items` | Plany dnia i tygodnia |
| `work_day_sessions` | Sesje „Rozpoczynam / Podsumuj dzień” |
| `work_obstacles` | Przeszkody operacyjne |
| `work_summaries` | Podsumowania dnia/tygodnia (`ai_draft`) |

Migracje: `120`–`124`.

## Adaptery źródeł

| `source_type` | Adapter | Sync |
|---------------|---------|------|
| `manual` | `manual-adapter.ts` | Pełna kontrola na `work_items` |
| `kanban_task` | `kanban-task-adapter.ts` | Lustro z `process_kanban_tasks` |
| `process_item` | `process-item-adapter.ts` | Checklisty / protokoły / rozliczenia |
| `service_intake` | `service-intake-adapter.ts` | Zgłoszenia serwisowe |
| `project_agreement` | `project-agreement-adapter.ts` | Ustalenia (akceptacja zespołu) |
| `inspection` | `inspection-adapter.ts` | Przeglądy serwisowe |
| `resource_plan_item` | `resource-plan-item-adapter.ts` | Plan zasobów |
| `functionality_task` | `functionality-task-adapter.ts` | Zadania ankiety funkcjonalności |

Agregacja: przy `ensureMyItems()` serwer wywołuje `syncAllWorkItemSources()`.

## Warstwy aplikacji

```
lib/my-work/*                    — typy, state machine, filtry, adaptery, AI, dashboard
lib/ai/my-work-ai.ts             — generowanie AI (OpenAI + fallback)
lib/supabase/my-work-server.ts   — CRUD, workflow, uprawnienia
lib/supabase/my-work-sync.ts     — agregacja źródeł
lib/supabase/my-work-plans-server.ts — plany, sesje, przeszkody
lib/supabase/my-work-dashboard-server.ts — pulpit managera
store/my-work-store.ts           — cache sesji (ensure/force)
components/my-work/*             — UI
app/api/my-work/*                — REST API
```

## Uprawnienia

- **pracownik**: własne zadania + wspierający; plan dnia, podsumowanie, analiza ryzyk własnego planu
- **manager/administrator**: tworzenie, edycja, weryfikacja, widok zespołu, pulpit, sugestie AI zadań

## AI (Etap 4)

| Endpoint | Kto | Wynik |
|----------|-----|-------|
| `POST /api/my-work/ai/day-summary` | Pracownik | Szkic podsumowania dnia → `work_summaries.ai_draft` |
| `POST /api/my-work/ai/suggest-tasks` | Manager | Propozycje zadań → `ai_generated` przy tworzeniu |
| `POST /api/my-work/ai/analyze-risks` | Pracownik | Notatki ryzyk przy potwierdzaniu planu tygodnia |

Fallback: `lib/my-work/suggestion-provider.ts` (reguły bez OpenAI).

## Pulpit managera (Etap 5)

- Trasa: `/moja-praca/pulpit`
- API: `GET /api/my-work/dashboard`
- Metryki: `lib/my-work/dashboard-metrics.ts` — zaległe, weryfikacja, przeszkody, obciążenie, źródła zadań

## Powiadomienia

`work_item_assigned`, `work_item_sent`, `work_item_obstacle_reported`, `work_item_verification_needed`, `work_item_takeover_requested`

Link: `/moja-praca/zadania?item={id}`

## Etapy — status

| Etap | Zakres | Status |
|------|--------|--------|
| 1 | Zadania, Kanban, workflow | ✅ |
| 2 | Plany dnia/tygodnia, przeszkody | ✅ |
| 3 | Agregacja modułów, edycja, przejęcie | ✅ |
| 4 | AI sugestie i ryzyka | ✅ |
| 5 | Pulpit managera | ✅ |

## Kolejne kroki (opcjonalnie)

- Moduł **Czas pracy** (`/moja-praca/czas-pracy`)
- Realtime odświeżanie pulpitu
- Audyt sugestii AI w osobnej tabeli
