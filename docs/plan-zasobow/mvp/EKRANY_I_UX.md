# Ekrany i UX — Plan Zasobów

## 1. Ustawienia → Słowniki (`/ustawienia/plan-zasobow`)

`components/settings/dictionary-settings-page.tsx` — jeden generyczny edytor dla wszystkich 10
słowników modułu. Zakładki wg `DICTIONARY_KEYS` (role operacyjne, kompetencje, poziomy
kompetencji, zespoły, obszary, typy pracy, statusy planu, poziomy ryzyka, typy nieobecności,
typy budżetów). Każda pozycja: nazwa, opis, wybór koloru, wybór ikony (`ICON_OPTIONS` —
`lib/resource-plan/icon-options.ts`), przełącznik aktywności, sortowanie przyciskami góra/dół
(wzorem `field-options-editor.tsx` — w aplikacji nie ma biblioteki drag&drop dla list ustawień).

## 2. Panel admina użytkownika — rozszerzenie profilu zasobowego

`components/admin/user-resource-profile-editor.tsx`, wywoływany z
`components/admin/user-admin-panel.tsx` obok standardowych pól konta. Sekcje:

- **Role operacyjne** i **Zespoły** — chipy do przełączania (`toggle`), z możliwością wielu
  wyborów naraz.
- **Kompetencje** — lista z wyborem poziomu (select ze słownika `competency_level`) + notatka,
  dodawanie/usuwanie.
- **Certyfikaty** — nazwa, data wydania/wygaśnięcia, link do pliku, notatka.
- **Nieobecności** — typ (select ze słownika `absence_type`), zakres dat, status
  (`planned`/`confirmed`/`cancelled`), notatka.
- **Limity i dane planistyczne** (w głównym formularzu `user-admin-panel.tsx`): dzienny/tygodniowy
  limit godzin, lokalizacja bazowa, opcjonalna stawka kosztowa, dostępność do planowania.

## 3. Edytor szablonu procesu — wymagania zasobowe etapu

`components/process/process-stage-resource-panel.tsx`, rozwijany panel pod tytułem każdego
etapu w `components/process/process-template-editor.tsx`. Pola:

- Min. liczba osób / optymalna liczba osób, szacowany czas trwania (dni) i roboczogodziny.
- Domyślny budżet robocizny i materiałów, domyślne ryzyko (select ze słownika `risk_level`).
- Flagi: „może przebiegać równolegle”, „wymaga lidera”, „dopuszcza ucznia/juniora”.
- **Wymagane role** — lista par (rola ze słownika `operational_role`, min. liczba osób),
  dodawanie/usuwanie.
- **Wymagane kompetencje** — lista par (kompetencja, min. poziom), dodawanie/usuwanie.
- **Zależności** — wybór innych etapów tego samego szablonu, od których zależy dany etap.

Te dane są bazą dla auto-podpowiedzi w panelu tworzenia elementu planu (§5).

## 4. Plan Zasobów (`/plan-zasobow`) — przełącznik Gantt / Lista

`app/plan-zasobow/page.tsx` renderuje jeden z dwóch widoków przez pill-przełącznik w nagłówku
strony (domyślnie **Gantt**). Oba czytają z tej samej warstwy danych
(`store/resource-plan-store.ts`) i tego samego panelu edycji (`ResourcePlanSidePanel`).

### 4.1. Widok Gantt (domyślny)

`components/resource-plan/resource-plan-gantt.tsx`. Siatka: sticky pierwsza kolumna (etykieta
wiersza), przewijana w poziomie oś dni bieżącego okresu, nawigacja okresami jak w liście.

- **Przełącznik zoomu** (pill): **Miesiąc** (domyślny, kolumny = dni z numerem) / **Kwartał** /
  **Rok** (kolumny = dni bez etykiety, nagłówek grupuje po nazwie miesiąca — pojedynczy dzień jest
  za wąski na numer). Zmiana zoomu resetuje nawigację do bieżącego okresu.
- **Przełącznik grupowania wierszy** (pill, wzorem zakładek `dictionary-settings-page.tsx`):
  Osoby (domyślnie, z `useProcessStore().teamProfiles`) / Zespoły (słownik `team`) / Projekty
  (aktywne projekty, z podetykietą klienta).
- **Kolumny dni** z wyróżnieniem weekendów i polskich świąt ustawowych (wyszarzone tło, nazwa
  święta w tooltipie nagłówka — tylko w zoomie miesięcznym) oraz dzisiejszego dnia (kolor akcentu).
- **Bloki elementów planu** — kolor i ikona ze statusu (`plan_status`), tooltip (`title`) z
  tytułem, projektem, osobą odpowiedzialną, zespołem i ryzykiem. Pozycja i szerokość liczone
  proporcjonalnie do godzin (nie tylko całymi dniami), więc krótkie zadania w ciągu dnia widać
  jako węższe bloki.
- **Tory (lanes)** — nakładające się czasowo elementy w tym samym wierszu renderują się jedno
  pod drugim (algorytm zachłanny `assignGanttLanes`), więc konflikt jest widoczny bez klikania.
- **Interakcje** (Pointer Events, `setPointerCapture` — ten sam wzorzec co dotykowy drag w
  `kanban-task-card.tsx`):
  - przeciągnięcie środka bloku w poziomie → zmiana terminu (przesunięcie, zachowana długość),
  - przeciągnięcie środka bloku w pionie do innego wiersza → zmiana przypisania (osoby/zespołu/
    projektu, zależnie od aktualnego grupowania) — wiersz-cel jest podświetlony w trakcie
    przeciągania, blok wizualnie „unosi się” nad wiersze,
  - przeciągnięcie 8px uchwytu na lewym/prawym brzegu → zmiana długości (rozciąganie),
  - snapowanie zależne od zoomu (pełne dni w miesiącu, tygodnie w kwartale, miesiące w roku —
    kolumna dnia jest za wąska przy dużym oddaleniu, by chwycić konkretny dzień); puszczenie
    zapisuje przez `updateItem` i od razu przelicza ostrzeżenia (`validateResourcePlanItem`),
    prezentowane w odznaczalnym żółtym banerze — **nigdy nie blokuje zapisu**,
  - kliknięcie bez przeciągnięcia → otwiera `ResourcePlanSidePanel` w edycji,
  - dwuklik na pustym miejscu wiersza → nowy element z datą startu odpowiadającą kliknięciu.
- Selektor „Szybko z szablonu…” + przycisk „Nowy element planu” — jak w widoku listy.

### 4.2. Widok listy

- Nawigacja miesiącami: „← Poprzedni” / „Następny →” / „Dziś”, zakres dociągany przez
  `useResourcePlanStore().ensureRange(from, to)` (cache po zakresie dat).
- Lista elementów planu widocznych w danym miesiącu (filtr po nakładaniu się zakresu dat),
  sortowana chronologicznie. Każdy wiersz to klikalny przycisk otwierający panel edycji:
  - kolorowy pionowy pasek statusu (`status.color`),
  - tytuł (lub nazwa projektu, jeśli brak własnego tytułu) + podtytuł (projekt · klient · typ pracy),
  - zakres dat/godzin (`formatRange` — jeden dzień: „dd.mm · gg:mm–gg:mm”, wiele dni: pełny zakres),
  - plakietki statusu i ryzyka (kolor + ikona ze słownika, wzięte 1:1 z `resource_dictionary_items`),
  - plakietka zespołu (jeśli przypisany),
  - osoba odpowiedzialna (`getUserDisplayName`) + licznik dodatkowych uczestników (`+N`),
  - ikona ostrzeżenia (`AlertTriangle`, żółta) gdy **brak** przypisanej osoby i uczestników,
    inaczej ikona edycji (`Pencil`).
- Selektor „Szybko z szablonu…” (widoczny, gdy istnieje ≥1 szablon) + przycisk „Nowy element
  planu” otwierają panel w trybie tworzenia.
- Stan pusty: karta z komunikatem „Brak zaplanowanych elementów w tym miesiącu.”

### 4.3. Szablony elementu planu

Zakładka „Szablony elementu planu” w `dictionary-settings-page.tsx` (osobne pola: typ pracy,
planowane godziny, 3× budżet, domyślne ryzyko, domyślne notatki — poza standardowymi
nazwą/opisem/kolorem/ikoną edytowanymi dla wszystkich słowników). W panelu bocznym i toolbarach
Gantta/listy dostępny szybki wybór szablonu, który wypełnia formularz nowego elementu jednym
kliknięciem (np. „Produkcja rozdzielni” — patrz `STAN_WDROZENIA.md`).

## 5. Panel boczny tworzenia/edycji elementu planu

`components/resource-plan/resource-plan-side-panel.tsx` — pełnoekranowy Radix `Dialog`
(wzorem `process-item-panel.tsx`; w aplikacji nie istnieje dedykowany komponent Drawer/Sheet).

Przepływ:

1. Wybór **projektu** → lista dostępnych **etapów procesu** ograniczona do etapów szablonu tego
   projektu (z żywego `process_stages` lub, jeśli projekt ma zamrożony `template_snapshot`, z
   `ensureAnchoredTemplateSnapshot`).
2. Wybór etapu → przycisk **„Zastosuj podpowiedzi etapu”** wypełnia formularz na podstawie
   definicji etapu: wymagane role/kompetencje (informacyjnie), min. liczba osób, szacowane
   godziny, domyślne budżety, domyślne ryzyko — użytkownik może je swobodnie nadpisać.
3. Pola formularza: tytuł, zakres dat/godzin, godziny planowane/rzeczywiste, osoba odpowiedzialna
   (select z profili zespołu — `useProcessStore().teamProfiles`), dodatkowi uczestnicy (multi,
   z opcjonalną rolą i flagą lidera), zespół, status, typ pracy, ryzyko + notatka ryzyka, trzy
   budżety (robocizna/materiały/dojazd), notatki.
4. **Ostrzeżenia w czasie rzeczywistym** — po każdej zmianie formularza wywoływana jest
   `validateResourcePlanItem()` (patrz `ARCHITEKTURA.md` §6); lista ostrzeżeń renderowana nad
   przyciskiem zapisu, z rozróżnieniem `warning`/`danger` (kolor/ikona).
5. Jeśli są aktywne ostrzeżenia, zapis wymaga zaznaczenia checkboxa **„Rozumiem ryzyko, zapisz
   mimo ostrzeżeń”** (`accepted_risk`) — **nigdy hard blocka**, koordynator zachowuje decyzyjność.
6. Zapis: `createItem`/`updateItem` w `useResourcePlanStore()`, po sukcesie panel się zamyka
   (`onSaved`).

## 6. Planowane, niezaimplementowane jeszcze widoki (Etap 6 i rozszerzenia Gantta)

| Widok | Ścieżka (propozycja) | Zakres |
|---|---|---|
| Kalendarz | `/plan-zasobow/kalendarz` | Widok miesiąc/tydzień, elementy planu jako wydarzenia. W aplikacji nie ma biblioteki kalendarza — do wyboru: własny komponent siatki (wzorem `process-milestone-dates-panel.tsx`, ale z rozkładem miesiąca) albo lekka biblioteka (do ustalenia z właścicielem produktu). |
| Dashboard modułu | `/plan-zasobow/dashboard` | Karty KPI (Recharts) — obciążenie firmy/zespołu/osoby, liczba konfliktów, zadania zagrożone, wolna zdolność, nieprzypisane projekty/zadania, planowany budżet robocizny. Patrz `STAN_WDROZENIA.md` Etap 6. |
| ~~Gantt — zoom tydzień/kwartał~~ | ~~rozszerzenie `resource-plan-gantt.tsx`~~ | Zrobione — zoom miesiąc/kwartał/rok, patrz §4.1 i `STAN_WDROZENIA.md`. |

Kalendarz i dashboard mogą reużyć istniejącą warstwę danych (`store/resource-plan-store.ts`,
`lib/resource-plan/validations.ts`) bez zmian w modelu — to był jeden z celów budowy MVP jako
listy/Gantta najpierw.

## 7. Responsywność mobilna (portret)

Toolbary Gantta i listy (`resource-plan-gantt.tsx`, `resource-plan-list.tsx`) oraz wiersz wyboru
szablonu w panelu bocznym (`resource-plan-side-panel.tsx`) stosują wzorzec: `flex-col` (elementy
pod sobą) na wąskim ekranie → `sm:flex-row` (elementy w rzędzie) od ~640px wzwyż. Przyciski
nawigacji okresu chowają etykietę tekstową na mobile (widoczna tylko ikona chevron), a
przełączniki/select/przycisk główny są pełnej szerokości na mobile dla łatwiejszego dotyku. Wiersze
listy pokazują teraz zawsze zakres dat i osobę odpowiedzialną (wcześniej ukryte na wąskich
ekranach) — zawijają się naturalnie razem z resztą treści wiersza.

Sama siatka Gantta pozostaje przewijana w poziomie na każdej szerokości — to zamierzony wzorzec dla
wykresów Gantta (linia czasu wymaga więcej miejsca niż szerokość ekranu telefonu), nie coś do
„naprawienia” w pionie.
