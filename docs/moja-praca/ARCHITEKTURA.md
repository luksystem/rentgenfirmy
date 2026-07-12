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

## Adaptery źródeł (Etap 1)

| `source_type` | Adapter | Sync |
|---------------|---------|------|
| `manual` | `manual-adapter.ts` | Pełna kontrola na `work_items` |
| `kanban_task` | `kanban-task-adapter.ts` | Lustro z `process_kanban_tasks` |

Agregacja Kanban: przy `ensureMyItems()` serwer upsertuje `work_items` dla otwartych kart z `assignee_id = bieżący użytkownik`.

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

## Kolejne etapy

- **Etap 2**: `work_plans`, plany dnia/tygodnia, przeszkody, podsumowania
- **Etap 3**: adaptery checklist, serwis, ustalenia
- **Etap 4**: AI sugestie i ryzyka
- **Etap 5**: dashboard managera
