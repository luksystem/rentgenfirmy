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

## 4. Plan Zasobów (`/plan-zasobow`) — przełącznik Gantt / Lista / Kalendarz / Dashboard

`app/plan-zasobow/page.tsx` renderuje jeden z czterech widoków przez pill-przełącznik w nagłówku
strony (domyślnie **Gantt**). Wszystkie czytają z tej samej warstwy danych
(`store/resource-plan-store.ts`) i tego samego panelu edycji (`ResourcePlanSidePanel`) — żaden
widok nie duplikuje logiki fetchowania czy walidacji.

### 4.1. Widok Gantt (domyślny)

`components/resource-plan/resource-plan-gantt.tsx`. Siatka: sticky pierwsza kolumna (etykieta
wiersza), przewijana w poziomie oś dni bieżącego okresu, nawigacja okresami jak w liście.

- **Przełącznik zoomu** (pill): **Miesiąc** (domyślny, kolumny = dni z numerem) / **Kwartał** /
  **Rok** (kolumny = dni bez etykiety, nagłówek grupuje po nazwie miesiąca — pojedynczy dzień jest
  za wąski na numer). Zmiana zoomu resetuje nawigację do bieżącego okresu.
- **Przełącznik grupowania wierszy** (pill, wzorem zakładek `dictionary-settings-page.tsx`):
  Osoby (domyślnie, z `useProcessStore().teamProfiles`) / Zespoły (słownik `team`) / Projekty
  (aktywne projekty, z podetykietą klienta).
- **Sortowanie wierszy w widoku Projekty** — projekty z elementami planu w aktualnie widocznym
  okresie (miesiąc/kwartał/rok) są zawsze na górze; pozostałe (bez zadań w tym oknie czasowym)
  poniżej, oddzielone poziomym separatorem z podpisem „Projekty bez elementów planu w tym
  okresie”. Przełączenie okresu (nawigacja lub zoom) przelicza podział na nowo. Widoki Osoby/
  Zespoły zachowują dotychczasową, stałą kolejność.
- **Kolumny dni** z wyróżnieniem weekendów i polskich świąt ustawowych (wyszarzone tło, nazwa
  święta w tooltipie nagłówka — tylko w zoomie miesięcznym) oraz dzisiejszego dnia (kolor akcentu).
- **Bloki elementów planu** — kolor i ikona ze statusu (`plan_status`), tooltip (`title`) z
  tytułem, projektem, osobą odpowiedzialną, zespołem, ryzykiem i treścią ostrzeżeń (jeśli są).
  Pozycja i szerokość liczone proporcjonalnie do godzin (nie tylko całymi dniami), więc krótkie
  zadania w ciągu dnia widać jako węższe bloki. Mała ikonka ostrzeżenia (żółta/czerwona zależnie
  od `severity`) pojawia się przy etykiecie bloku, gdy `validateResourcePlanItem()` zwróci
  ostrzeżenia — ta sama reguła co plakietka w widoku listy.
- **Szybka zmiana statusu i ryzyka na kafelku** — dwie małe kolorowe „kropki” po obu stronach
  etykiety bloku (lewa = status, prawa z przerywaną obwódką = ryzyko), każda to natywny
  `<select>` (bez dodatkowej zależności typu Popover) — kliknięcie otwiera listę wartości ze
  słownika i zapisuje wybór od razu (`updateItem` + ponowne przeliczenie ostrzeżeń), bez
  otwierania pełnego panelu edycji. `stopPropagation` na `pointerDown`/`click` chroni przed
  wywołaniem przeciągania bloku.
- **Tory (lanes)** — nakładające się czasowo elementy w tym samym wierszu renderują się jedno
  pod drugim (algorytm zachłanny `assignGanttLanes`), więc konflikt jest widoczny bez klikania.
- **Sub-bloki osób zaangażowanych** (tylko w widoku Osoby) — każda osoba zaangażowana (poza
  odpowiedzialną) ma własny, węższy blok z przerywaną obwódką na SWOIM wierszu, w zakresie dat,
  jaki jej przypisano (cały zakres elementu albo własny, węższy — patrz panel edycji §5).
  Plakietka pokazuje jej aktualny % zaangażowania. Blok da się przeciągać/rozciągać niezależnie
  od głównego — ograniczony do zakresu głównego elementu (nie da się „wyjechać” poza termin
  przydziału); rozciągnięcie automatycznie przelicza % (patrz D23 w `ARCHITEKTURA.md`). Kliknięcie
  (bez przeciągnięcia) otwiera pełny panel edycji elementu.
- **Plakietka „część X/Y”** — elementy powstałe z podziału jednego przydziału (§5, „Podział
  przydziału na części”) mają na głównym bloku i na karcie listy małą plakietkę z numerem części
  i łączną liczbą części w grupie (`linked_group_id`).
- **Podział przez kliknięcie na kafelku** — ikonka nożyczek na bloku (obok plakietek statusu/
  ryzyka) uzbraja tryb podziału (obwódka bloku zmienia się na przerywaną w kolorze akcentu,
  kursor na crosshair). W tym trybie przeciąganie/rozciąganie jest wyłączone; każde kliknięcie na
  kafelku wyznacza nową, przyciągniętą do siatki dni (wg aktualnego zoomu) linię podziału z małym
  popoverem „Podzielić tutaj? ✓ / ✕” tuż nad kreską. ✓ dzieli element (`splitItem`) i zamyka tryb;
  ✕ (albo ponowne kliknięcie ikonki nożyczek) zamyka tryb bez zmian. Błąd (np. przydział za krótki,
  by wybrać punkt w środku) pojawia się jako mały czerwony komunikat w popoverze.
- **Kaskadowe przesunięcie pociętych części** — jeśli w panelu edycji włączono „Zależność
  pociętych” (§5) dla grupy podzielonego przydziału, przesunięcie/rozciągnięcie prawej krawędzi
  jednej części w Gantcie automatycznie przesuwa też wszystkie kolejne (późniejsze w czasie) części
  tej samej grupy o tę samą wartość, zachowując odstępy między nimi (patrz D28 w
  `ARCHITEKTURA.md`). Rozciąganie lewej krawędzi nie kaskaduje.
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
  - plakietka ostrzeżeń (`AlertTriangle` + liczba) obliczona przez `validateResourcePlanItem()` —
    czerwona, gdy wśród ostrzeżeń jest `severity: "danger"`, żółta gdy tylko `warning`; tooltip
    z treścią wszystkich ostrzeżeń; brak plakietki = brak ostrzeżeń. Ikona edycji (`Pencil`) po
    prawej, zawsze widoczna.
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
3a. **% zaangażowania uczestnika** — przy każdej osobie zaangażowanej: pole liczbowe 1–100%,
   z przeliczanymi na żywo szacowanymi godzinami (`≈ X.X h` = godziny elementu × %, patrz D23 w
   `ARCHITEKTURA.md`). Przełącznik **„Własny zakres dat”** (domyślnie wyłączony = uczestnik
   dziedziczy cały zakres elementu) odsłania dwa pola data/godzina, ograniczone do zakresu elementu
   — np. uczestnik zaangażowany tylko 2 z 5 dni zadania.
3b. **Podział przydziału na części** — sekcja widoczna tylko przy edycji istniejącego elementu:
   pole „Podziel w momencie” (data/godzina wewnątrz zakresu elementu) + przycisk „Podziel”, który
   tworzy drugą część (ten sam „przydział” logicznie, dwa elementy techniczne — patrz D25). Ten
   sam podział da się też zrobić klikając bezpośrednio na kafelku w Gantcie (§4.1).
   Jeśli element już jest częścią podzielonego przydziału, sekcja z licznikiem części pokazuje
   dodatkowo: checkbox „Zastosuj zmiany wspólnych pól… do innych części” (domyślnie zaznaczony,
   propaguje tytuł/status/ryzyko/notatki — nie terminy/godziny/budżety/uczestników — do pozostałych
   części przy zapisie); checkbox „Włącz zależność pociętych” (zapisywany od razu, patrz D28 —
   kaskadowe przesunięcie w Gantcie); przycisk „Scal części z powrotem w jeden przydział” (widoczny
   tylko gdy grupa ma więcej niż jedną część) z inline potwierdzeniem tak/nie — odwraca podział:
   zachowuje najstarszą część jako nośnik, rozciąga jej zakres na całą grupę, sumuje godziny (gdy
   wszystkie znane) i łączy uczestników bez duplikatów (patrz D27).
4. **Sugerowane osoby** (Etap 7) — nad wyborem osoby odpowiedzialnej, karta z do 5 klikalnymi
   „chipami” kandydatów (ranking `suggestResourcePlanCandidates()` przez
   `getActiveSuggestionProvider()`, patrz `ARCHITEKTURA.md` §5/D19/D20): imię i nazwisko,
   plakietka % dopasowania (zielona ≥80%, żółta ≥50%, czerwona <50%), oznaczenie „nieobecność”
   lub liczba konfliktów, jeśli dotyczy. Tooltip (`title`) pokazuje pełne uzasadnienie (`reasons`)
   — np. „Brak kompetencji »Spawanie«”, „Przekroczy tygodniowy limit godzin”. Klik na kandydata
   ustawia go jako osobę odpowiedzialną (`assigneeId`) — nie zastępuje ręcznego wyboru z listy
   poniżej, tylko go przyspiesza. Sekcja jest pusta (niewidoczna), gdy nie ma jeszcze żadnych
   użytkowników w `teamProfiles` do zaproponowania.
5. **Ostrzeżenia w czasie rzeczywistym** — po każdej zmianie formularza wywoływana jest
   `validateResourcePlanItem()` (patrz `ARCHITEKTURA.md` §6); lista ostrzeżeń renderowana nad
   przyciskiem zapisu, z rozróżnieniem `warning`/`danger` (kolor/ikona).
6. Jeśli są aktywne ostrzeżenia, zapis wymaga zaznaczenia checkboxa **„Rozumiem ryzyko, zapisz
   mimo ostrzeżeń”** (`accepted_risk`) — **nigdy hard blocka**, koordynator zachowuje decyzyjność.
7. Zapis: `createItem`/`updateItem` w `useResourcePlanStore()`, po sukcesie panel się zamyka
   (`onSaved`).

## 6. Widok Kalendarza

`components/resource-plan/resource-plan-calendar.tsx`. Przełącznik **Miesiąc** / **Tydzień**
(pill, jak zoom Gantta). Siatka 7 kolumn (dni tygodnia, poniedziałek pierwszy):

- **Miesiąc** — 5–6 wierszy obejmujących cały widoczny zakres (łącznie z dniami z poprzedniego/
  następnego miesiąca wypełniającymi siatkę); dni spoza aktualnego miesiąca są przygaszone
  (`opacity-40`).
- **Tydzień** — jeden wiersz, więcej miejsca w komórce na elementy planu (bez rozkładu godzinowego
  — to rola Gantta; kalendarz to przegląd dnia, nie precyzyjne planowanie godzin).
- Każda komórka dnia: numer dnia (w tygodniu też skrócona nazwa dnia), wyszarzone tło dla
  weekendu/święta (`polish-holidays.ts`, tooltip z nazwą święta), ramka akcentu dla „dziś”.
- Elementy planu jako kolorowe plakietki (kolor/ikona statusu, jak w liście) — klik otwiera edycję;
  gdy więcej niż mieści się w komórce, lista przewija się w pionie (bez „+N więcej”, żeby nie
  dodawać kolejnego kliknięcia do zobaczenia pełnej listy).
- Klik na numer dnia (mała ikona `+` przy nim) → nowy element planu z domyślną godziną startu
  9:00 tego dnia.
- Nawigacja: „← Poprzedni” / „Następny →” / „Dziś”, jednostka nawigacji = aktualna granularność
  (miesiąc lub tydzień).

## 7. Dashboard modułu

`components/resource-plan/resource-plan-dashboard.tsx`. Nawigacja miesiącami jak w liście.

- **5 kart KPI** (`MetricCard`, wzorem strony głównej): Elementy planu, Planowane godziny, Budżet
  robocizny, Nieprzypisane (żółty akcent gdy >0, zielony gdy 0), Konflikty (czerwony akcent gdy
  >0, zielony gdy 0).
- **Dwa wykresy** (`BarPanel`/`PiePanel` z `components/charts.tsx`): „Obciążenie godzinowe per
  osoba (top 8)” (słupkowy) i „Elementy planu wg statusu” (kołowy, kolory statusów).
- **Tabela „Obciążenie i wolna zdolność”** — per osoba z co najmniej jednym elementem planu w
  oknie: suma zaplanowanych godzin, szacowany limit (limit tygodniowy × liczba tygodni okna,
  jeśli osoba ma ustawiony limit), plakietka „Przeciążenie” (czerwona) / „W normie” (zielona) /
  „Brak limitu” (szara, gdy profil nie ma ustawionego limitu godzin).
- **„Konflikty i ryzyka”** — lista elementów planu z aktywnym ostrzeżeniem `severity: "danger"`
  (ten sam silnik walidacji co panel edycji), z treścią konfliktu; klik otwiera edycję. To
  spełnia dawny brak „osobnego widoku Konflikty i ryzyka” z Etapu 5.
- **„Nieprzypisane elementy planu”** — elementy bez `assigneeId` i bez uczestników; klik otwiera
  edycję, żeby szybko przypisać osobę (ewentualnie korzystając z sekcji „Sugerowane osoby” w
  panelu, patrz §5).

## 8. Responsywność mobilna (portret)

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
