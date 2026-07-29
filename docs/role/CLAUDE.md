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
- **zdrowie etapu (zielony / żółty / czerwony)** — wdrożone, do rozbudowy
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

Kolejność czytania w `00-README.md`. Prompty do zadań w `07-prompty.md`.

## Zasady pracy w tym repo

- Przed implementacją zawsze inwentaryzacja tego, co istnieje. Nie zakładaj, że coś jest, bo jest opisane w dokumencie.
- Czego nie znajdziesz w kodzie — napisz „nie znalazłem".
- Plan przed kodem. Faza pierwsza każdego modułu ma dawać wartość samodzielnie.
- Bądź krytyczny wobec specyfikacji. Jeśli coś jest przekombinowane albo nie da się sensownie zamodelować — powiedz wprost.
