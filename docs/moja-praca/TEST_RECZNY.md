# Test ręczny — Moja praca → Zadania

## Przygotowanie

1. Uruchom migracje `120`–`124` w Supabase.
2. Opcjonalnie: `supabase/seed/work_items_demo.sql`.
3. Zaloguj się jako **manager** i **pracownik** (dwa konta).
4. Dla testów AI: ustaw `OPENAI_API_KEY` (bez klucza działa fallback reguł).

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

## Scenariusz 7: Rytm dnia i podsumowanie AI

1. Pracownik → **Rozpoczynam dzień**.
2. W **Plan na dziś** kliknij pozycję — otwiera się panel szczegółów zadania.
3. Na koniec dnia → **Podsumuj dzień** → **Wygeneruj szkic AI**.
4. Edytuj tekst i **Zakończ dzień** (opcjonalnie: przenieś niewykonane na jutro).
5. Sprawdź w bazie `work_summaries.ai_draft` (jeśli użyto AI).

## Scenariusz 7b: Anulowane zadanie znika z planu dnia

1. Manager anuluje zadanie, które było w planie dnia pracownika.
2. Pracownik (dzień już rozpoczęty) → odśwież stronę **Zadania** lub poczekaj na odświeżenie kontekstu.
3. Anulowane zadanie **nie** powinno być w **Plan na dziś** (ani jako puste „Zadanie”).
4. Na liście aktywnych zadań anulowanego wpisu też nie ma.

## Scenariusz 8: Plan tygodnia i analiza ryzyk

1. Manager tworzy/wysyła plan tygodnia dla pracownika.
2. Pracownik otwiera potwierdzenie planu → **Analiza ryzyk AI**.
3. Uzupełnione pole zagrożeń → **Potwierdź**.

## Scenariusz 9: Sugestie AI zadań (manager)

1. Manager → **Nowe zadanie** → **Zaproponuj zadania** (panel AI).
2. **Użyj sugestii** — pola formularza się wypełniają, badge AI po utworzeniu.
3. Filtr **Sugestie AI** na liście pokazuje utworzone zadanie.

## Scenariusz 10: Agregacja z innych modułów

1. Utwórz zgłoszenie serwisowe / element procesu / zadanie ankiety z assignee.
2. Pracownik → **Odśwież** na liście zadań.
3. Zadanie pojawia się z odpowiednim źródłem i linkiem **Przejdź do źródła**.

## Scenariusz 11: Pulpit managera

1. Manager → **Moja praca → Pulpit**.
2. Sprawdź KPI (zaległe, weryfikacja, przeszkody).
3. Kliknij pozycję w **Wymaga reakcji** — przejście do zadania.

## Scenariusz 12: Edycja i przejęcie zadania

1. Manager edytuje zadanie ręczne (**Edytuj zadanie**).
2. Osoba wspierająca na zadaniu widzi **Poproś o przejęcie**.
3. Manager/assignee dostaje powiadomienie `work_item_takeover_requested`.

## Scenariusz 13: Anulowane zadania i usuwanie trwałe

1. Manager anuluje zadanie ręczne (**Edytuj zadanie** → **Anuluj zadanie**).
2. Manager / admin → **Zadania** → sekcja **Anulowane** (lub filtr statusu **Anulowane**).
3. Otwórz anulowane zadanie → **Edytuj zadanie**.
4. Jako **administrator**: przycisk **Usuń trwale** (tylko zadanie ręczne).
5. Jako manager (bez roli admin): przycisku **Usuń trwale** nie ma — tylko podgląd archiwum.
