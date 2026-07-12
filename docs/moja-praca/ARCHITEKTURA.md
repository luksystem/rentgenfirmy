# Architektura — Moja praca → Zadania

## Cel

Moduł agreguje zadania operacyjne użytkownika jako **wewnętrzne zlecenia** (`work_items`), bez duplikowania danych źródłowych. Warstwa `work_items` obsługuje workflow: przyjęcie, realizacja, przeszkody, weryfikacja.

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

Migracje: `120_kanban_task_assignee_id.sql`, `121_my_work_items.sql`, `122_my_work_notifications.sql`.

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

Agregacja: przy `ensureMyItems()` serwer wywołuje `syncAllWorkItemSources()` (Kanban, proces, serwis, ustalenia, przeglądy, plan zasobów, funkcjonalność).

Migracje: `120`–`124` (ostatnia: katalog źródeł Etap 3 + `assignee_id` na `project_functionality_tasks`).

## Kolejne etapy

- **Etap 2** ✅: plany dnia/tygodnia, przeszkody, podsumowania
- **Etap 3** ✅: pełna agregacja modułów + prośba o przejęcie zadania
- **Etap 4**: AI sugestie i ryzyka

## Warstwy aplikacji

```
lib/my-work/*           — typy, state machine, filtry sekcji, adaptery
lib/supabase/my-work-server.ts  — logika serwerowa, uprawnienia, sync
lib/supabase/my-work-repository.ts — klient API
store/my-work-store.ts  — cache sesji (ensure/force)
components/my-work/*    — UI Lista/Kanban, dialogi
app/api/my-work/*       — REST API
```

## Uprawnienia

- **pracownik**: własne zadania + wspierający
- **manager/administrator**: tworzenie, wysyłanie, weryfikacja, widok zespołu

## Powiadomienia

Nowe `kind` w `user_notifications`: `work_item_assigned`, `work_item_sent`, `work_item_obstacle_reported`, `work_item_verification_needed` itd.

Link: `/moja-praca/zadania?item={id}`

- **Etap 5**: dashboard managera
