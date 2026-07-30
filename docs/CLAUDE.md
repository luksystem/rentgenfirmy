# CLAUDE.md

## Czym jest Rentgen

Wewnętrzny system Luksystem Sp. z o.o. — firmy wykonującej instalacje elektryczne i teletechniczne, Smart Home (Loxone), BMS i CCTV w domach jednorodzinnych. Rentgen prowadzi projekty realizacyjne od podpisania umowy do przekazania do serwisu.

## Dwie zasady nadrzędne

> **1. Jedna informacja ma jedno miejsce.**
> Proces nie dubluje modułów (Zadania, Ustalenia, Akceptacje, Zmiany projektu, Planowanie zasobów, Oferty dodatkowe). Proces **pobiera z nich status** i traktuje go jako warunek przejścia między etapami. Gdzie potrzebny jest przekrój — budujemy **widok**, nie nową tabelę.

> **2. Kod zna mechanizmy. Szablon zna wartości.**
> Silnik modyfikatorów, łańcuch fallbacku, ranking kandydatów, bezpiecznik ciszy — to mechanizmy niezależne od tego, ile jest etapów i jak się nazywają. Wszystko, co w dokumentacji występuje jako tabela per etap (faza komunikacji, wagi, wymagane kompetencje, SLA, macierz odpowiedzialności) jest **atrybutem szablonu procesu**, nie stałą w kodzie.

Jeśli specyfikacja łamie którąś z tych zasad — zgłoś to zamiast implementować.

## Odwiązanie od konkretnych etapów (obowiązuje wstecz i wprzód)

Kod nie odwołuje się do konkretnego etapu, kamienia ani elementu procesu — ani po nazwie, ani po numerze, ani po pozycji w kolejności. Jeśli logika potrzebuje "tego etapu, który coś robi", musi istnieć **atrybut**, po którym da się go znaleźć.

Test: czy po dodaniu, usunięciu, przestawieniu albo rozbiciu etapu w szablonie trzeba cokolwiek zmienić w kodzie? Jeśli tak — to błąd, nie konfiguracja.

Atrybut bez edytora to atrybut, którego nikt nie zmieni. Konfigurowalność liczy się dopiero wtedy, gdy da się ją zmienić bez programisty. Każdy nowy atrybut konfiguracyjny ma w zakresie fazy pozycję "edytor" albo jawnie odnotowany dług.

## Co już istnieje w systemie

- projekty z etapami
- **szablon procesu — instancja per projekt jest kopią, z mechanizmem aktualizacji**
- role: lider techniczny, lider operacyjny, programista
- kompetencje pracowników z poziomami
- planowanie zasobów — **przydział wisi na etapie**, ma pole lidera i osób wspomagających
- wnioski urlopowe i urlopy
- zapisywanie czasu pracy
- zmiany projektowe jako zadania — z akceptacjami, osobami, datami, blokowaniem od etapu
- oferty dodatkowe per projekt
- tablice kanban z wzorcem
- zdrowie **projektu** (zielony/żółty/czerwony) — wdrożone, liczone z celów, notatek ze spotkań, zadań kanban i zmian projektowych. **Zdrowie etapu nie istnieje** — do zbudowania jako drugi konsument wspólnej warstwy sygnałów.
- tablica wdrożeniowa
- asystent planowania
- **integracja SMS**
- klienci mogą dostać dostęp do systemu (nie wszyscy skorzystają)

## Czego system NIE ma i mieć nie będzie

- **dostępu do treści rozmów na WhatsAppie** — komunikacja z inwestorami odbywa się głównie tam. Żaden wskaźnik nie może opierać się na liczbie ani treści wiadomości. Mierzymy **fakt kontaktu**, nie jego zawartość.

## Zespół (lipiec 2026)

| Osoba | Sloty ról |
|---|---|
| właściciel | `wlasciciel` |
| lider operacyjny | `opiekun_projektu` + `koordynator_operacyjny` |
| lider techniczny | `koordynator_techniczny` + `projektant` |
| programista | `wdrozeniowiec` |
| osoba biurowa | `asystent_procesu` (slot zdefiniowany, domyślnie nieobsadzony) |
| 6 instalatorów | `instalator`, z tego 2–3 jako `lider_montazu` |

Ok. 18 projektów równolegle. **Role są slotami na projekcie, nie polami na użytkowniku** — jedna osoba trzyma kilka slotów, a przyszłe rozdzielenie ról to przepięcie slotu bez zmian w procesie.

## Dokumentacja

Proces, role i specyfikacje modułów budowanych obecnie: `/docs/`, kolejność czytania w `/docs/00-README.md`. Prompty do zadań: `/docs/07-prompty.md`.

Opisy istniejących modułów: `/docs/modules/[nazwa].md`, wg szablonu `/docs/modules/_TEMPLATE.md`.

> **Zasada: dokumentacja modułu jest aktualizowana w tym samym commicie, co zmiana w module.**
> Nie „przy okazji", nie „raz na kwartał". Osobny cykl aktualizacji nigdy nie działa — po trzech miesiącach opisuje stan sprzed trzech miesięcy, czyli jest gorszy niż jego brak, bo ludzie mu ufają.

Praktycznie:
- zmieniasz moduł → aktualizujesz jego plik w tym samym commicie
- moduł bez pliku, którego dotykasz → utwórz plik przy tej okazji
- nie pisz dokumentacji modułów, których nikt nie rusza; poczekaj na pierwszą większą zmianę

Pisząc opis modułu: **opisuj tylko to, co robi kod.** Gdzie zamiar jest niejasny — zapytaj, zamiast zgadywać. Oznaczaj miejsca, gdzie zachowanie wygląda na przypadkowe albo niedokończone.

## Zasady pracy w tym repo

- Przed implementacją zawsze inwentaryzacja tego, co istnieje. Nie zakładaj, że coś jest, bo jest opisane w dokumencie.
- Czego nie znajdziesz w kodzie — napisz „nie znalazłem".
- Plan przed kodem. Faza pierwsza każdego modułu ma dawać wartość samodzielnie.
- Bądź krytyczny wobec specyfikacji. Jeśli coś jest przekombinowane albo nie da się sensownie zamodelować — powiedz wprost.
- Żaden wskaźnik nie jest miarą oceny pracownika. Nie buduj rankingów osób.
- Żaden komunikat nie wychodzi do inwestora bez zatwierdzenia człowieka.

## Standardy testowe (obowiązujące dla wszystkich przyszłych zmian)

**a) Każda migracja seedująca asertuje liczbę zmienionych wierszy i rzuca wyjątkiem przy rozbieżności.**
Znana z góry oczekiwana liczba (`v_expected`), po pętli/UPDATE-cie `get diagnostics` + `raise exception` przy niezgodności. Nie `raise warning` — ostrzeżenie ginie w konsoli SQL Editora.
Powód: w fazie 1 seed dopasowujący etapy po tytule trafił w zero wierszy i migracja zgłosiła sukces. Naprawiona wersja (kluczująca na `process_stages.code`) miała asercję — złapała kolejny, realny błąd (pomyłka w ręcznym liczeniu macierzy odpowiedzialności, 36 zamiast 37). Migracja bez asercji, która nic nie zrobiła, jest gorsza niż migracja, która się wywala — cicha porażka wygląda jak sukces.

**b) Każda funkcja wyliczająca stan ma test tablicy prawdy — wszystkie kombinacje wejść, nie tylko przypadek szczęśliwy.**
Dotyczy w szczególności: tabeli bram faz komunikacji i funkcji statusu projektu (cykl życia, D19). Test szczęśliwej ścieżki nie łapie błędów na granicach (progi histerezy, wartości `null`, stany przejściowe) — te wychodzą dopiero na produkcji, na prawdziwych danych, gdzie są najdroższe do naprawienia.

**c) Każda tabela lub kolumna wisząca na grafie szablonu procesu musi być objęta testem round-trip zapis → odczyt.**
Graf szablonu (`process_templates` → `process_stages` → `process_milestones` → `process_items` plus wszystko, co wisi na `stage_id`/`milestone_id`) jest zapisywany hurtem przez `saveProcessTemplate`. Dopóki zapis kasował i wstawiał od nowa, każda kolumna nieujęta w tym zapisie wracała po cichu do wartości domyślnej, a każda tabela z `ON DELETE CASCADE` ginęła bezpowrotnie — tak zniknęła cała macierz `process_stage_role_responsibility` i pięć atrybutów etapu z fazy 1. Dowiedzieliśmy się o tym po miesiącach i przypadkiem.
Zabezpieczenie: `lib/process/__tests__/template-save-roundtrip.test.ts` — asercja „kompletność mapowania" wywala się, gdy do `ProcessStage` dojdzie pole bez odwzorowania na kolumnę. Dopisanie kolumny bez dopisania jej do tego testu jest błędem, nie przeoczeniem.

**d) Każda zmiana w module, który ma dziś działającego konsumenta, ma w zakresie osobną pozycję na regresję tego konsumenta.**
Nie jako założenie „przecież nie ruszamy tej ścieżki" — jako jawna pozycja w planie/szacunku. Dotyczy zwłaszcza refaktorów dzielonej logiki (np. `suggestions.ts`/`planning-assistant.ts`) i zmian schematu pod polami czytanymi przez więcej niż jeden ekran.
