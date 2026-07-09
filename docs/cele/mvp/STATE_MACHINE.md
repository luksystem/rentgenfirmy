# State Machine — Cel i Przegląd

> Zależność: `ARCHITEKTURA.md` (D2, D4, D6).

## 1. Status celu (`goals.status`)

| Status | Znaczenie | Wejście |
|---|---|---|
| `planned` | Cel utworzony, okres jeszcze się nie zaczął lub brak aktywności | `POST /api/goals` |
| `in_progress` | Trwa realizacja | pierwsza aktualizacja `progress_percent` lub nadejście `period_start` |
| `at_risk` | Zagrożony — ręcznie oznaczony albo wynik przeglądu `outcome = 'at_risk'/'off_track'` | `PATCH /goals/{id}` lub zamknięcie przeglądu |
| `on_hold` | Wstrzymany ręcznie | `PATCH /goals/{id}` |
| `settled` | Rozliczony (patrz sekcja 3) | `POST /goals/{id}/settlement` |
| `cancelled` | Anulowany | `PATCH /goals/{id}` |

Kolumny na tablicy (`goal-board-view.tsx`) odpowiadają bezpośrednio tym statusom (D2) —
`cancelled` domyślnie ukryty/zwinięty.

```
        POST /goals
            │
            ▼
       ┌─────────┐   pierwsza aktualizacja %   ┌──────────────┐
       │ planned │───────────────────────────▶│ in_progress   │
       └─────────┘                             └──────┬───────┘
            │  PATCH (on_hold)                        │ wynik przeglądu / ręcznie
            ▼                                          ▼
       ┌─────────┐  ◀────────── PATCH (wznów) ── ┌───────────┐
       │ on_hold │                                │ at_risk   │
       └─────────┘                                └─────┬─────┘
                                                          │ POST /settlement
            (z każdego z powyższych) ────────────────────▼
                                                    ┌───────────┐
                                                    │  settled  │──┐
                                                    └───────────┘  │ jeśli is_recurring=true
                                                                    ▼
                                                     tworzy nową instancję (planned),
                                                     recurrence_parent_id = ten cel
```

`cancelled` dostępny z każdego stanu poza `settled` (rozliczony cel nie jest anulowywany —
można go co najwyżej edytować narrację rozliczenia).

## 2. Przegląd (`goal_reviews`) — D6

| Pole | Rola |
|---|---|
| `scheduled_at` | zaplanowany termin |
| `requires_action` | czy przegląd wymaga zamknięcia (domyślnie `true`) |
| `completed_at` | `null` = otwarty/przeterminowany; wypełnione = zamknięty |
| `closed_by` | kto zamknął |
| `outcome` | `on_track` \| `at_risk` \| `off_track` — wpływa na `goals.status` |

**Kto może zamknąć przegląd** (interpretacja robocza, bez formalnej hierarchii raportowania
w `profiles` — do potwierdzenia w przyszłości, patrz `PYTANIA_I_RYZYKA.md`):
- właściciel celu (`goals.owner_id`),
- profil z rolą `manager` lub `administrator` („przełożony”),
- uczestnik z `goal_participants.role = 'reviewer'`.

Zamknięcie przeglądu z `outcome IN ('at_risk','off_track')` automatycznie proponuje zmianę
`goals.status` na `at_risk` (użytkownik potwierdza lub zmienia recznie).

## 3. Rozliczenie i cykliczność (D4)

`POST /api/goals/{id}/settlement`:
1. Wymaga wypełnienia: `settlement_status`, `settlement_what_worked`, `settlement_what_failed`,
   `settlement_conclusions`.
2. Ustawia `goals.status = 'settled'`, `settled_at`, `settled_by`.
3. **Jeśli `is_recurring = true`**: tworzy nową instancję celu —
   - kopiuje: `board_id`, `level`, `owner_id`, uczestników, `methodology_id`,
     `methodology_fields` (szablon), definicje `goal_kpis` (z `current_value` wyzerowanym),
   - przelicza `period_start`/`period_end` na kolejny okres wg `period_type`,
   - ustawia `recurrence_parent_id = {poprzedni cel}`, `recurrence_root_id` = najstarszy w łańcuchu,
   - status nowej instancji: `planned`.
4. Generuje powiadomienie dla właściciela: „Nowy okres celu «X» został utworzony” (D8).

## 4. Niezmienniki

- Rozliczenie (`GET` rozliczenia) dostępne tylko gdy `status = 'settled'`.
- Zmiana `progress_percent` lub `status` po `settled` wymaga jawnego „odblokowania”
  (`PATCH` z potwierdzeniem) — cofa status na `in_progress` i czyści pola rozliczenia
  (do potwierdzenia z właścicielem produktu, czy to potrzebne w MVP).
- Każda zmiana `progress_percent`/`status` zapisuje wiersz w `goal_updates`
  (poprzednia/nowa wartość, autor) — to jest techniczna „Historia celu” (ekran #3, zakładka).
