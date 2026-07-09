# Pytania i ryzyka — status po decyzjach właściciela produktu

> Zależność: `ARCHITEKTURA.md` (tabela decyzji D1–D14). Ten dokument zawiera **tylko** pozycje,
> które pozostały otwarte lub wymagają uwagi przy implementacji — pełna lista pierwotnych pytań
> została rozstrzygnięta i przeniesiona do `ARCHITEKTURA.md` §3 jako decyzje D1–D14.

## Otwarte / do potwierdzenia przy implementacji

1. **„Przełożony” bez formalnej hierarchii** (D6) — `profiles` nie ma relacji podległości
   (np. `manager_id`). Na MVP interpretujemy „przełożonego” jako profil z rolą `manager` lub
   `administrator` (każdy, nie konkretny przełożony danej osoby). Jeśli to niewystarczające,
   trzeba dodać strukturę raportowania do `profiles` — osobna decyzja, poza zakresem tego
   wdrożenia.
2. **Cofanie rozliczenia** (`STATE_MACHINE.md` §4) — czy edycja celu po `settled` powinna być
   możliwa (odblokowanie → powrót do `in_progress`, czyszczenie pól rozliczenia), czy rozliczony
   cel ma być trwale zamknięty (tylko edycja narracji rozliczenia)? Do potwierdzenia przed Fazą 3.
3. **Scheduler powiadomień/przypomnień** (D8) — powiadomienia o zbliżającym się przeglądzie /
   końcu okresu wymagają mechanizmu cyklicznego (cron/scheduled job). W repo istnieje analogiczny
   wzorzec pola `planning_reminder_sent_at` w module Przeglądów serwisowych
   (`084_inspections.sql`) — zakładamy wykorzystanie tego samego mechanizmu (do zweryfikowania,
   jaki to dokładnie scheduler — Supabase Edge Function / Vercel Cron / inny — przy Fazie 6).
4. **Skala danych** — liczba tablic/celów oczekiwana w praktyce (dziesiątki vs. setki) wpływa na
   decyzję: pełny fetch + cache w `goal-store.ts` (jak dziś Kanban) vs. paginacja od startu.
   Do potwierdzenia przed Fazą 1, zgodnie z checklistą reguły `data-fetch-cache`
   („Paginacja tylko gdy lista UI jest duża — setki+”).
5. **Batch liczników na karcie celu** — liczba powiązanych zadań / otwartych problemów musi być
   liczona zbiorczo (jedno zapytanie po `goal_links` dla wszystkich celów na tablicy), nie N+1
   per karta — do zapewnienia w `lib/supabase/goal-board-repository.ts` (Faza 1/8).
6. **Koszt wywołań AI** — na start bez limitu (D9). Warto ponownie ocenić po Fazie 6 (AI „w
   trakcie” może istotnie zwiększyć liczbę wywołań), ale nie blokuje MVP.
7. **Pełna matryca uprawnień/widoczności** — D5 to rozwiązanie interim (poziom `goal_board_kinds`,
   nie per zespół/użytkownik). Właściciel produktu potwierdził, że to odrębna, późniejsza faza —
   nie blokuje wdrożenia, ale trzeba pamiętać, że dzisiejsze RLS (`ARCHITEKTURA.md` §5) będzie
   wymagało przebudowy, gdy ta faza nadejdzie (nie tylko rozszerzenia).
8. **Moduł Problemów** — nie istnieje jeszcze w aplikacji. `goal_links.linked_type = 'problem'`
   jest przygotowany, ale bez tabeli źródłowej `problems` liczniki „otwartych problemów” na karcie
   celu (Faza 1/7) będą zwracać zawsze 0 do czasu powstania tego modułu — to oczekiwane, nie błąd.
