# Test ręczny — Moja praca → Zadania

## Przygotowanie

1. Uruchom migracje `120`, `121`, `122` w Supabase.
2. Opcjonalnie: `supabase/seed/work_items_demo.sql`.
3. Zaloguj się jako **manager** i **pracownik** (dwa konta).

## Scenariusz 1: Manager tworzy i wysyła zadanie

1. Manager → **Moja praca → Zadania**.
2. Kliknij **Nowe zadanie**.
3. Wybierz pracownika, wpisz nazwę, termin, oczekiwany rezultat.
4. Zaznacz **Wyślij od razu** → **Utwórz i wyślij**.
5. Sprawdź powiadomienie u pracownika (dzwonek) z linkiem do zadania.

## Scenariusz 2: Pracownik przyjmuje zadanie

1. Pracownik → **Moja praca → Zadania**.
2. Zadanie w sekcji **Do zapoznania** (widok Lista) lub kolumnie **Do zapoznania** (Kanban).
3. Otwórz zadanie → **Przyjmij zadanie**.
4. Wybierz **Przyjmuję** + potwierdź bez zastrzeżeń → **Zapisz przyjęcie**.
5. Status zmienia się na **Przyjęte**; w historii widoczne zdarzenie audytowe.

## Scenariusz 3: Sync z Kanban

1. Przypisz kartę Kanban pracownikowi (z `assignee_id` lub nazwą dopasowaną do profilu).
2. Pracownik → **Moja praca → Zadania** → **Odśwież**.
3. Karta pojawia się jako zadanie ze źródłem **Tablica wdrożeń**.
4. Link **Przejdź do źródła** prowadzi do `/projekty/{id}/proces`.

## Scenariusz 4: Zamknięcie i weryfikacja

1. Pracownik: otwórz zadanie w realizacji → **Podsumuj wykonanie** → **Wykonane**.
2. Status → **Do weryfikacji**; manager dostaje powiadomienie.
3. Manager: otwiera zadanie → **Zatwierdź wykonanie**.
4. Status → **Zaakceptowane przez managera**.

## Scenariusz 5: Filtry i uprawnienia

1. Użyj filtrów: projekt, status, **Zaległe**, **Wymagające reakcji**.
2. Pracownik B nie widzi zadań przypisanych pracownikowi A.
3. Manager przełącza **Zespół** i widzi zadania podwładnych.

## Scenariusz 6: Zgłoszenie przeszkody przy przyjęciu

1. Pracownik przy zadaniu do zapoznania wybiera **Zgłaszam brak** + komentarz.
2. Manager dostaje powiadomienie `work_item_obstacle_reported`.
3. Zadanie ma status **Zgłoszone zagrożenie** / widoczną przeszkodę.
