# Instrukcja — manager (Moja praca)

Przewodnik dla osoby zarządzającej zespołem: tworzenie zadań, weryfikacja, plany, pulpit i reakcja na przeszkody.

## Gdzie pracuję

| Miejsce | Adres | Po co |
|---------|-------|-------|
| **Zadania** | Moja praca → **Zadania** | Własne zadania + widok zespołu |
| **Pulpit** | Moja praca → **Pulpit** (`/moja-praca/pulpit`) | KPI, kolejki wymagające reakcji |
| **Dostępność** | Moja praca → **Dostępność** | Planowanie urlopów zespołu |

---

## Uprawnienia managera

Jako manager (lub admin) możesz:

- tworzyć i wysyłać **zadania ręczne**,
- edytować i **anulować** zadania ręczne,
- weryfikować wykonanie (**Zatwierdź wykonanie**),
- przeglądać zadania **zespołu** (przełącznik widoku),
- tworzyć i wysyłać **plan tygodnia** dla pracownika,
- korzystać z **sugestii AI** przy tworzeniu zadań,
- reagować na przeszkody i prośby o wyjaśnienie.

Nie możesz trwale **usuwać** zadań — to rola administratora (tylko szkice / anulowane, źródło `manual`).

---

## Pulpit managera

Wejdź na **Moja praca → Pulpit**, aby zobaczyć:

| Obszar | Znaczenie |
|--------|-----------|
| **Zaległe** | Termin minął, zadanie nie zamknięte |
| **Do weryfikacji** | Pracownik zgłosił wykonanie — czeka na Ciebie |
| **Przeszkody** | Zgłoszone blokery / braki |
| **Obciążenie zespołu** | Ile otwartych zadań ma każda osoba |
| **Wymaga reakcji** | Skrócona kolejka — kliknięcie prowadzi do zadania |

Pulpit uzupełnia codzienną pracę na liście zadań — nie zastępuje jej.

---

## Tworzenie i wysyłanie zadania

### Krok po kroku

1. **Moja praca → Zadania** → **Nowe zadanie**.
2. Wypełnij:
   - **Przypisany pracownik** (wymagane),
   - **Nazwa**, **termin**, **oczekiwany rezultat**,
   - opcjonalnie: projekt, priorytet, osoby wspierające.
3. **Utwórz** (szkic) lub zaznacz **Wyślij od razu** → **Utwórz i wyślij**.

Po wysłaniu pracownik dostaje powiadomienie. Zadanie ma status **Do zapoznania**.

### Sugestie AI (opcjonalnie)

W dialogu **Nowe zadanie**:

1. **Zaproponuj zadania** — AI podpowiada tytuły i opisy na podstawie kontekstu.
2. **Użyj sugestii** — wypełnia formularz.
3. Utworzone zadanie ma badge **Sugestia AI**; filtr **Sugestie AI** na liście je wyróżnia.

Bez klucza OpenAI działa uproszczony fallback regułowy.

---

## Obsługa zadań zespołu

### Widok zespołu

Na **Zadania** przełącz widok na **Zespół**, aby zobaczyć zadania podwładnych (nie tylko swoje).

Filtry: projekt, status, **Zaległe**, **Wymagające reakcji**, **Sugestie AI**.

### Weryfikacja wykonania

1. Powiadomienie lub sekcja **Do weryfikacji** / Pulpit → **Wymaga reakcji**.
2. Otwórz zadanie → sprawdź podsumowanie pracownika.
3. **Zatwierdź wykonanie** → status **Zaakceptowane przez managera**.

Jeśli wynik jest niepełny, możesz wrócić do pracownika komentarzem (bez zatwierdzania).

### Reakcja na przeszkody

Gdy pracownik przy przyjęciu lub w trakcie zgłosi **brak**, **zagrożenie** lub **przeszkodę**:

- dostajesz powiadomienie,
- zadanie ma status **Zgłoszone zagrożenie** / widoczną przeszkodę,
- odpowiedz w komentarzach, zmień termin (**Edytuj zadanie**) lub anuluj, jeśli zadanie nieaktualne.

### Edycja i anulowanie

Dotyczy głównie zadań **ręcznych** (źródło: zadanie managera):

| Akcja | Kiedy |
|-------|-------|
| **Edytuj zadanie** | Zmiana terminu, opisu, przypisania |
| **Anuluj zadanie** | Zadanie nie powinno być realizowane — znika z list aktywnych pracownika |
| **Usuń trwale** | Tylko **administrator**, tylko zadanie ręczne w statusie szkic lub anulowane |

### Przeglądanie anulowanych zadań

Anulowane zadania **nie** widać na liście pracownika. Jako manager lub administrator:

1. Wejdź na **Moja praca → Zadania** (widok **Zespół** jeśli szukasz zadań podwładnych).
2. Na dole listy znajdziesz sekcję **Anulowane** — albo ustaw filtr **Status → Anulowane**.
3. W widoku Kanban anulowane trafiają do kolumny **Zamknięte**.
4. Otwórz zadanie → **Edytuj zadanie**.

**Administrator** przy zadaniu ręcznym w statusie anulowanym widzi przycisk **Usuń trwale** (nieodwracalne usunięcie z bazy). Manager może tylko anulować aktywne zadania — nie usuwa ich trwale.

**Anulowanie a plan dnia:** Po anulowaniu pozycja jest usuwana z planu dnia pracownika przy następnym wczytaniu kontekstu dnia (lub odświeżeniu strony).

Zadania z innych modułów (Kanban, serwis, proces) edytujesz w module źródłowym — **Moja praca** je tylko odbija. Anulowanie takiego zadania w **Moja praca** nie usuwa rekordu źródłowego.

---

## Plan tygodnia

Plan tygodnia to uzgodnienie priorytetów z pracownikiem na wybrany tydzień (poniedziałek–niedziela).

### Gdzie to jest w aplikacji

**Plan tygodnia nie ma osobnej pozycji w menu.** Znajdziesz go na stronie:

**Moja praca → Zadania** (`/moja-praca/zadania`)

Panel **Plan tygodnia** jest pod sekcją **Rytm dnia**, nad filtrami listy zadań. Jako manager lub administrator widzisz też listę pozycji planu i selektor **Pracownik**.

### Tworzenie planu

1. Na **Zadania** otwórz panel **Plan tygodnia**.
2. Wybierz **pracownika** — plan ładuje się dla wybranej osoby.
3. Jeśli **brak planu** na bieżący tydzień:
   - **Utwórz ze zadań** — szkic z aktywnych zleceń pracownika,
   - **Kopiuj z poprzedniego tygodnia** — przeniesienie pozycji z poprzedniego tygodnia.
4. Jeśli plan jest **szkicem** — możesz **Odśwież ze zadań**, **Wyślij plan** lub **Edytuj plan**.
5. Jeśli plan jest już **wysłany / potwierdzony** — użyj **Edytuj plan** (zmiana pozycji, dat, komentarza), potem **Zapisz szkic** lub **Zapisz i wyślij** ponownie do pracownika.

### Wysyłanie (gdy szkic)

### Potwierdzenie przez pracownika

Pracownik widzi plan, może uruchomić **Analiza ryzyk AI**, uzupełnić pole zagrożeń i **Potwierdzić**. Ty widzisz status planu (wysłany / potwierdzony).

Plan tygodnia **nie zastępuje** planu dnia — pracownik nadal używa **Rozpoczynam dzień** do codziennego rytmu.

---

## Rytm dnia (własny)

Manager też może korzystać z **Rytm dnia** na stronie **Zadania**:

- **Rozpoczynam dzień** — plan z własnych zadań (dzisiaj, zaległe, do zapoznania, w realizacji),
- kliknięcie pozycji w **Plan na dziś** otwiera szczegóły zadania,
- **Podsumuj dzień** — podsumowanie z opcjonalnym szkicem AI.

To narzędzie osobiste — nie pokazuje planów dnia pracowników. Ich postęp śledzisz przez **Pulpit** i widok **Zespół**.

---

## Zadania z innych modułów

System automatycznie tworzy wpisy w **Moja praca**, gdy w innych modułach coś jest przypisane do pracownika, np.:

- karta **Tablica wdrożeń**,
- zgłoszenie **Serwis**,
- element **Procesu**,
- **Ustalenia**, **Przeglądy**, **Plan zasobów**, **Ankieta funkcjonalności**.

**Ty jako manager:**

- nie „wymyślasz” ich ręcznie w **Nowe zadanie** — one synchronizują się ze źródłem,
- zmiany statusu w module źródłowym mogą zaktualizować zadanie po synchronizacji,
- link **Przejdź do źródła** w szczegółach zadania prowadzi do oryginalnego rekordu.

Przycisk **Odśwież** (u Ciebie lub u pracownika) wymusza pełną synchronizację.

---

## Prośba o przejęcie zadania

Gdy osoba wspierająca kliknie **Poproś o przejęcie**:

1. Dostajesz powiadomienie.
2. Otwórz zadanie i zdecyduj: zmiana przypisania w **Edytuj zadanie** lub odpowiedź w komentarzu.

---

## Powiadomienia — na co reagować

| Typ | Twoja reakcja |
|-----|----------------|
| Zadanie **do weryfikacji** | Zatwierdź lub odbij z komentarzem |
| **Przeszkoda** / brak / zagrożenie | Wyjaśnij, zmień zakres/termin, ewentualnie anuluj |
| **Potrzebuję wyjaśnienia** | Odpowiedz w wątku zadania |
| **Prośba o przejęcie** | Zmień assignee lub odmów z uzasadnieniem |
| Plan tygodnia **potwierdzony** | Informacyjnie — sprawdź uwagi pracownika |

---

## Typowy tydzień managera

| Dzień | Akcje |
|-------|-------|
| **Poniedziałek** | Pulpit → zaległe i przeszkody; wyślij **plan tygodnia** jeśli potrzebny |
| **Codziennie** | Kolejka **Wymaga reakcji**; weryfikacje z poprzedniego dnia |
| **W trakcie tygodnia** | **Nowe zadanie** dla ad-hoc; edycja terminów |
| **Piątek** | Przejrzyj obciążenie zespołu na Pulpicie; domknij wiszące weryfikacje |

---

## Częste pytania

**Pracownik nie widzi zadania.**  
Sprawdź przypisanie, czy zadanie zostało **wysłane** (nie tylko szkic), czy nie jest **anulowane**. Niech kliknie **Odśwież**.

**W planie dnia pracownika widać stare pozycje.**  
Po anulowaniu lub zamknięciu zadania pozycja powinna zniknąć z planu dnia po odświeżeniu strony. Jeśli nie — zgłoś do admina (ew. ręczne odświeżenie przez pracownika: przeładuj stronę **Zadania**).

**Czy mogę planować dzień za pracownika?**  
Plan **dnia** generuje się automatycznie u pracownika po **Rozpoczynam dzień**. Ty planujesz tydzień (**Plan tygodnia**) i pojedyncze zadania (**Nowe zadanie**).

**AI nie działa.**  
Sprawdź `OPENAI_API_KEY` w środowisku. Bez klucza działają uproszczone reguły (szkice i sugestie są mniej szczegółowe).

---

## Powiązane dokumenty

- [INSTRUKCJA_PRACOWNIK.md](./INSTRUKCJA_PRACOWNIK.md) — co robi pracownik po Twojej stronie
- [TEST_RECZNY.md](./TEST_RECZNY.md) — scenariusze testowe
- [ARCHITEKTURA.md](./ARCHITEKTURA.md) — model techniczny
