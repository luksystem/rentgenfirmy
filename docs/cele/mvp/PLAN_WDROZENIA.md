# Plan wdrożenia etapami — Tablica Celów

> Zależność: `ARCHITEKTURA.md`, `EKRANY_I_UX.md`, `STATE_MACHINE.md`, `AI_I_METODOLOGIE.md`.
> Każda faza jest samodzielnie wydawalna i testowalna.

| Faza | Zakres | Efekt |
|---|---|---|
| **0. Fundament danych** | Migracja: `goal_board_kinds`, `goal_boards`, `goals` (z kolumnami cykliczności D4 i `parent_goal_id` D3), `goal_participants`, `goal_kpis`, `goal_updates`, `goal_comments`, `goal_reviews`, `goal_initiatives`, `goal_links`, `goal_methodologies` (schemat, **bez** seedu treści), `goal_ai_suggestions`. RLS wg `ARCHITEKTURA.md` §5 (w tym `visibility` D5). Nowa pozycja w menu „Przestrzenie” (bez UI funkcjonalnego — placeholder). | Schemat gotowy, appka działa jak dotąd |
| **1. Szkielet CRUD** | `lib/goals/types.ts`, repozytoria, `goal-store.ts`, `goal-hydrator.tsx` (layout `/tablice-celow`), API `boards`/`goals` (bez AI, bez cykliczności w UI). Ekrany #1 (hub, tworzenie tablicy) i #2 (widok tablicy, kolumny=status D2). Tworzenie celu formularzem manualnym (wybór metodologii z listy — bez dynamicznych pól). Widok celu #3 (dane podstawowe + edycja, bez KPI/przeglądów/rozliczenia). | Ręczne zarządzanie tablicami i celami |
| **2. Monitorowanie** | `progress_percent` + `goal_updates` (log), komentarze, `goal_kpis` (CRUD manualny), harmonogram przeglądów `goal_reviews` + zamykanie (guard ról D6), badge „najbliższy przegląd” na karcie. | Pełne monitorowanie bez AI |
| **3. Rozliczenie i cykliczność** | Formularz rozliczenia (`goal_settlement_form.tsx`), state machine wg `STATE_MACHINE.md` §3, automatyczne tworzenie kolejnej instancji dla `is_recurring = true` (`recurrence_parent_id`/`recurrence_root_id`). | Zamknięcie cyklu celu + wsparcie cykliczności |
| **4. Biblioteka metodologii** | Seed 9 metodologii (treść + `field_schema`), ekran #5 (lista + karta), dynamiczne renderowanie `field_schema` w formularzu tworzenia celu (zamiast statycznego wyboru z Fazy 1). | Metodologie w pełni użyteczne manualnie |
| **5. AI-doradca** | `POST /api/goals/ai/suggest` (`trigger: 'create'`), krok AI w wizardzie tworzenia celu, ostrzeżenia o ogólności/niemierzalności, zapis do `goal_ai_suggestions`. | Pełny flow tworzenia celu z AI |
| **6. AI w trakcie + powiadomienia** | `trigger: 'review'` (sugestie w trakcie trwania celu, D9), `lib/notifications/goal-activity.ts` — powiadomienia dla właściciela (zbliżający się przegląd, koniec okresu, niski progres, utworzona nowa cykliczna instancja) rozszerzające `user_notifications` (D8). | AI i przypomnienia aktywne przez cały cykl życia celu |
| **7. Widoki zbiorcze i analityczne** | Ekran #4 (`/zbiorcza`), #6 (`/podsumowanie` — bieżący okres, Recharts), #7 (`/historia` — analiza longitudinalna, ranking dowożenia, lista niedowiezionych, aktywność ustalania celów, D7), liczniki na kafelkach huba. | Raportowanie zarządcze i wnioski organizacyjne |
| **8. Integracja kontekstowa** | Pickery projekt/klient/etap/kamień milowy w formularzu celu (D11); zakładka „Cele” w dashboardzie klienta/projektu; `goal_links` do zadań Kanban (ręczne linkowanie istniejących zadań, bez generowania). | Cele widoczne na poziomie konkretnych projektów |
| **9. (Przyszłość, poza zakresem tego wdrożenia)** | Generowanie zadań/inicjatyw z `goal_initiatives` do `process_kanban_tasks`; pełna matryca uprawnień/widoczności (poza interim D5); integracja z modułem Problemów, gdy powstanie (`goal_links.linked_type = 'problem'`, cykl PDCA). | Rozszerzenia bez zmiany fundamentu danych |

## Uwagi do sekwencjonowania

- Fazy 0–3 dają w pełni użyteczny moduł **bez AI** — możliwe jest zatrzymanie się tutaj i ocena
  wartości przed inwestycją w Fazę 5+.
- Faza 4 (biblioteka metodologii) musi poprzedzać Fazę 5 (AI), bo AI opiera prompt na treści
  katalogu metodologii.
- Faza 7 (Historia i wnioski) wymaga zgromadzenia realnych danych z Faz 1–3 (rozliczonych celów)
  — sensowne żeby wejść w produkcję z Fazami 0–4 wcześniej, żeby zebrać dane do analiz.
