# Stan wdrożenia — Plan Zasobów

> Odniesienie do pierwotnego planu 8 etapów. **Wszystkie etapy 1–8 są zaimplementowane i
> zalintowane.** Dodatkowo, poza pierwotnym planem, zbudowano widok Kalendarza (miesiąc/tydzień) —
> patrz sekcja pod Etapem 4. Pozostały dług techniczny (testy automatyczne, API route'y
> serwerowe) opisany w sekcji „Braki i dług techniczny” na końcu dokumentu.

## Etap 1 — Fundament danych (słowniki) ✅ Zrobione

- Migracja `098_resource_plan_dictionaries.sql`: tabela `resource_dictionary_items` (10 słowników:
  role operacyjne, kompetencje, poziomy kompetencji, zespoły, obszary, typy pracy, statusy planu,
  poziomy ryzyka, typy nieobecności, typy budżetów) + funkcja `has_full_app_access()` + seed
  demonstracyjny.
- Backend: `lib/resource-plan/dictionary-types.ts`, `lib/supabase/dictionary-repository.ts`,
  `store/dictionary-store.ts`.
- UI: `components/settings/dictionary-settings-page.tsx` (generyczny edytor z zakładkami per
  słownik, sortowanie strzałkami, edycja nazwy/opisu/koloru/ikony/aktywności) +
  `app/ustawienia/plan-zasobow/page.tsx` + link z `/ustawienia`.

## Etap 2 — Rozszerzenie użytkownika ✅ Zrobione

- Migracja `099_resource_plan_user_extensions.sql`: `profiles` + limity godzin, lokalizacja
  bazowa, stawka kosztowa (opcjonalna), dostępność do planowania; nowe tabele
  `user_operational_roles`, `user_competencies`, `user_teams`, `user_certificates`,
  `user_absences`.
- Backend: `lib/resource-plan/user-resource-types.ts`, `lib/supabase/user-resource-repository.ts`
  (w tym `fetchUserResourceProfilesBatch` — batch, bez N+1), `store/user-resource-store.ts`.
- Rozszerzono `lib/auth/types.ts` (`UserProfile`, `UserProfileInput`) i
  `lib/supabase/profile-mappers.ts` o nowe pola profilu.
- UI: `components/admin/user-resource-profile-editor.tsx`, zintegrowany w
  `components/admin/user-admin-panel.tsx` (role, kompetencje z poziomem, zespoły, certyfikaty,
  nieobecności — chipy + formularze dodawania/usuwania).
- API: `app/api/admin/users/route.ts` i `app/api/admin/users/[id]/route.ts` parsują i zapisują
  nowe pola profilu.

## Etap 3 — Rozszerzenie procesu i etapów ✅ Zrobione

- Migracja `100_resource_plan_process_stage_extensions.sql`: `process_stages` + min/optymalna
  liczba osób, szacowany czas trwania i roboczogodziny, domyślne budżety, domyślne ryzyko, flagi
  (równoległość, wymagany lider, dozwolony uczeń); nowe tabele
  `process_stage_role_requirements`, `process_stage_competency_requirements`,
  `process_stage_dependencies`.
- Typy: `lib/process/types.ts` (`ProcessStage` rozszerzony — pola **opcjonalne**, by nie łamać
  istniejących generatorów szablonów w `template-factory.ts`/`default-templates.ts`).
- Mapowanie: `lib/supabase/process-mappers.ts` (`rowToProcessStage`) i
  `lib/process/anchored-template.ts` (`parseProcessTemplateSnapshot`) — obie ścieżki (z bazy i
  z zamrożonego JSONB snapshotu) uzupełniają domyślne wartości identycznie.
- Repo: `lib/supabase/process-repository.ts` — `fetchTemplatesGraph` dociąga wymagania batchowo;
  `insertTemplateStagesGraph` wstawia w dwóch fazach (najpierw etapy, potem wymagania i
  zależności), by uniknąć FK violation przy zależnościach „w przód”.
- UI: `components/process/process-stage-resource-panel.tsx`, zintegrowany w
  `components/process/process-template-editor.tsx` (rozwijany panel pod tytułem etapu).

## Etap 4 — Moduł Plan Zasobów, MVP ✅ Zrobione (wariant: lista, nie Gantt)

- Migracja `101_resource_plan_items.sql`: `resource_plan_items` + `resource_plan_item_participants`.
- Backend: `lib/resource-plan/types.ts`, `lib/supabase/resource-plan-repository.ts`
  (CRUD + `fetchResourcePlanItemsInRange`/`fetchResourcePlanItemsForProject`),
  `store/resource-plan-store.ts` (cache po zakresie dat, `ensureRange`).
- UI: `components/resource-plan/resource-plan-list.tsx` (nawigacja miesiąc wstecz/w przód,
  lista elementów planu z kolorami/ikonami statusu i ryzyka, projekt/klient/osoba
  odpowiedzialna) + `components/resource-plan/resource-plan-side-panel.tsx` (pełnoekranowy
  dialog tworzenia/edycji: projekt → etap procesu z auto-podpowiedzią wymagań, daty, godziny,
  osoba odpowiedzialna + uczestnicy, zespół, status, ryzyko, 3 typy budżetu, notatki).
- Nawigacja: wpis „Plan Zasobów” w grupie „Projekty” (`components/app-shell.tsx`),
  strona `app/plan-zasobow/page.tsx`.

**Aktualizacja:** po MVP listy dodano też widok **Gantt** (patrz niżej) — oba widoki
(`/plan-zasobow`, przełącznik „Gantt” / „Lista”) korzystają z tej samej warstwy danych
(`store/resource-plan-store.ts`), bez zmian w modelu. Kalendarz i dashboard modułu
(Etap 6) wciąż nie są zaimplementowane.

### Widok Gantt — przesuwanie i rozciąganie elementów na osi czasu ✅ Zrobione

- `lib/resource-plan/gantt-drag.ts` — logika przeliczania pikseli ↔ dni (snapowanie do pełnych
  dni, zachowanie godziny startu/końca), przydział elementów do „torów” (lanes) w ramach wiersza
  dla nakładających się terminów (`assignGanttLanes`).
- `components/resource-plan/resource-plan-gantt.tsx` — siatka: sticky pierwsza kolumna (etykieta
  wiersza) + przewijana w poziomie oś dni bieżącego miesiąca (nawigacja miesiąc wstecz/w przód,
  jak w liście). Przełącznik grupowania wierszy: **Osoby** (domyślnie) / **Zespoły** / **Projekty**
  (aktywne).
- Interakcje na blokach (Pointer Events — `onPointerDown/Move/Up` + `setPointerCapture`, wzorem
  istniejącego wzorca dotykowego z `components/process/kanban-task-card.tsx`):
  - przeciągnięcie środka bloku → **przesunięcie** całego zakresu (zachowuje długość),
  - przeciągnięcie lewego/prawego brzegu (uchwyty 8px) → **rozciągnięcie** (zmiana
    `startAt`/`endAt` niezależnie, z minimalnym czasem trwania 30 min),
  - kliknięcie bez ruchu → otwarcie `ResourcePlanSidePanel` w trybie edycji,
  - dwuklik na pustym miejscu wiersza → nowy element z datą startu wyliczoną z pozycji kursora.
  - Snapowanie: pełne dni (zgodnie z decyzją produktową), środek/brzegi bloku odzwierciedlają
    rzeczywistą godzinę (pozycja liczona proporcjonalnie w ramach dnia, nie tylko całymi kolumnami).
- Po zakończeniu przeciągania: zapis przez `useResourcePlanStore().updateItem`, następnie
  ponowne przeliczenie `validateResourcePlanItem` (bez kontekstu etapu procesu — `stage: null`,
  patrz ograniczenie poniżej) i pokazanie ewentualnych ostrzeżeń w odznaczalnym banerze nad
  siatką — **zapis nie jest blokowany** przez ostrzeżenia (zgodnie z D5 z `ARCHITEKTURA.md`).
- Wspólny mapper `resourcePlanItemToInput` (`lib/resource-plan/types.ts`) wydzielony z panelu
  bocznego, żeby Gantt i panel boczny nie duplikowały tej logiki.

### Aktualizacja: przeciąganie między wierszami + święta ✅ Zrobione

Na życzenie doprecyzowano zakres przeciągania (pierwotne ograniczenie D10 zostało zniesione):

- **Przeciąganie między wierszami** (`resolveGanttRowId` w `gantt-drag.ts`) — chwycenie środka
  bloku i przeniesienie go w pionie do innego wiersza zmienia przypisanie zgodnie z aktualnym
  grupowaniem (osoba/zespół/projekt). Wiersz pod kursorem wykrywany przez `elementFromPoint` z
  tymczasowym `pointer-events: none` na przeciąganym bloku (inaczej trafiałby sam w siebie).
  Podczas przeciągania blok wizualnie „unosi się" nad wiersze (CSS `transform: translateY` +
  `z-index`), a wiersz-cel jest podświetlony (`dragHoverRowId`). Przy zmianie projektu dodatkowo
  resetowany jest `processStageId` i aktualizowany `clientId` (jak w panelu bocznym).
- **Polskie święta ustawowe** (`lib/resource-plan/polish-holidays.ts`, algorytm Meeusa/Jonesa/
  Butchera dla Wielkanocy) — wyszarzone w nagłówku i tle wierszy tak jak weekendy, z nazwą święta
  w tooltipie nagłówka dnia.

**Wciąż otwarte:**
- Walidacja po przeciągnięciu nie ładuje definicji etapu procesu (`stage: null`), więc reguły
  „brak wymaganej roli/kompetencji/lidera/budżetu” (zależne od etapu) nie są sprawdzane od razu
  po drag — pojawią się dopiero po otwarciu elementu w pełnym panelu edycji.
- Brak synchronizacji sticky nagłówka dni w osi wertykalnej przy przewijaniu strony (tylko
  pierwsza kolumna jest sticky w poziomie) — do rozważenia przy dużej liczbie wierszy.
- ~~Brak przełącznika tygodnia/zoomu~~ — dodano zoom miesiąc/kwartał/rok, patrz sekcja niżej.

## Etap 4 (rozszerzenie) — Szablony elementu planu ✅ Zrobione

Powtarzalne "gotowce" elementu planu (np. **Produkcja rozdzielni**) do szybkiego wyboru z listy
zamiast wypełniania formularza od nowa:

- Migracja `104_resource_plan_item_templates.sql` — nowy `dictionary_key = 'plan_item_template'`
  w istniejącej generycznej tabeli `resource_dictionary_items` (bez nowej tabeli); bogatsze pola
  szablonu (typ pracy, planowane godziny, budżety robocizny/materiałów/dojazdu, domyślne ryzyko,
  domyślne notatki) w kolumnie `metadata` (jsonb). Seed demonstracyjny: „Produkcja rozdzielni”.
- `lib/resource-plan/plan-item-template.ts` — typ `PlanItemTemplateMetadata` +
  `readPlanItemTemplateMetadata`/`writePlanItemTemplateMetadata` (bezpieczne parsowanie jsonb).
- Ustawienia (`dictionary-settings-page.tsx`) — zakładka „Szablony elementu planu” z dodatkowymi
  polami (typ pracy, godziny, 3× budżet, ryzyko, notatki) widocznymi tylko dla tego słownika.
- Panel boczny (`resource-plan-side-panel.tsx`) — selektor szablonu + przycisk „Zastosuj”
  (nadpisuje tytuł i pola formularza wartościami z szablonu); dodatkowo `initialTemplateId` do
  automatycznego zastosowania przy otwarciu z toolbara.
- Szybkie dodawanie: w toolbarach widoku listy i Gantta (`Select` „Szybko z szablonu…”) —
  wybranie szablonu otwiera panel tworzenia z już zastosowanymi wartościami.

### Aktualizacja: zoom Gantta (kwartał/rok) + responsywność mobilna ✅ Zrobione

- **Zoom Gantta** — nowy przełącznik **Miesiąc** (domyślny) / **Kwartał** / **Rok** w toolbarze
  Gantta, obok przełącznika grupowania wierszy:
  - `lib/resource-plan/gantt-drag.ts`: `GanttZoom`, `getGanttPeriodRange(zoom, offset)` (zakres
    dat bieżącego okresu), `formatGanttPeriodLabel` (etykieta „lipiec 2026” / „3. kwartał 2026” /
    „2026”), `GANTT_ZOOM_DAY_WIDTH_PX` (40/14/5 px na dzień), `GANTT_ZOOM_SNAP_DAYS` (1/7/30 dni —
    przy kwartale/roku kolumna dnia jest za wąska, by precyzyjnie chwycić konkretny dzień, więc
    przeciąganie „przeskakuje” tydzień/miesiąc naraz), `groupGanttDaysByMonth` (grupowanie dni po
    miesiącu do nagłówka, gdy pojedynczy dzień jest za wąski na numer).
  - `resource-plan-gantt.tsx`: nawigacja „Poprzedni/Następny/Dziś” działa teraz w jednostce
    aktualnego zoomu (miesiąc/kwartał/rok); zmiana zoomu resetuje przesunięcie okresu do
    bieżącego. Nagłówek w widoku miesięcznym pokazuje numery dni (jak dotychczas); w
    kwartale/roku — nazwy miesięcy rozciągnięte na odpowiadającą liczbę kolumn dnia. Kolor tła
    weekendów/świąt w torach wierszy pozostaje na poziomie dnia niezależnie od zoomu.
  - Ograniczenie: przy zoomie rocznym (5px/dzień) precyzyjne przeciąganie jest z natury trudniejsze
    wizualnie — celowo skompensowane grubszym snapowaniem (30 dni), a nie osobną logiką
    pozycjonowania.
- **Responsywność mobilna (portret)** — pasek narzędzi Gantta i Listy (nawigacja okresu,
  przełączniki grupowania/zoomu, szybki wybór szablonu, przycisk „Nowy element planu”) był
  zbudowany z zagnieżdżonych `flex` bez zawijania — na wąskim telefonie w orientacji pionowej
  wymuszał scroll/ściśnięcie zamiast obrócenia na poziomo. Naprawiono:
  - Kontener toolbara: `flex-col` (pionowo, pod sobą) na mobile → `sm:flex-row` od ~640px.
  - Przyciski „Poprzedni”/„Następny”: ikony `ChevronLeft`/`ChevronRight` zawsze widoczne, etykieta
    tekstowa chowana na mobile (`hidden sm:inline`) — mniej miejsca na wąskim ekranie.
  - Przełączniki grupowania/zoomu (`w-fit`), select szablonu i przycisk „Nowy element” pełnej
    szerokości na mobile (`w-full sm:w-auto`) dla wygodnych celów dotykowych.
  - Wiersze listy (`resource-plan-list.tsx`): usunięto `hidden sm:block`/`hidden md:block` na
    zakresie dat i osobie odpowiedzialnej — te informacje były całkowicie niewidoczne na
    telefonie; teraz zawijają się naturalnie (`flex-wrap`) razem z resztą wiersza.
  - Panel boczny: wiersz wyboru szablonu (`Select` + przycisk „Zastosuj”) także `flex-col
    sm:flex-row` — pozostała część formularza już wcześniej korzystała z `grid sm:grid-cols-2/3`,
    więc na mobile była poprawnie jednokolumnowa.
  - **Bez zmian, celowo:** sama siatka Gantta (`overflow-x-auto`) nadal przewija się w poziomie na
    każdej szerokości ekranu — to standardowy, oczekiwany wzorzec dla wykresów Gantta (linia
    czasu z natury wymaga szerokości większej niż ekran telefonu), nie błąd responsywności.

## Widok Kalendarza (poza pierwotnym planem 8 etapów) ✅ Zrobione

Oryginalne wymagania UI wspominały Gantt/RTM, Kalendarz, Listę i Dashboard — Kalendarz nie był
częścią numerowanego planu 8 etapów, ale domknięto go razem z Etapem 6.

- `components/resource-plan/resource-plan-calendar.tsx` — jeden komponent z przełącznikiem
  **Miesiąc** / **Tydzień** (nie dwa osobne widoki, patrz D21 w `ARCHITEKTURA.md`). Siatka 7
  kolumn; w widoku miesięcznym dni spoza bieżącego miesiąca są przygaszone, dziś podświetlone
  ramką. Weekendy/święta wyszarzone (reużycie `polish-holidays.ts` — ten sam algorytm co w
  Gantcie).
- Każdy dzień pokazuje plakietki elementów planu (kolor/ikona statusu, jak w liście/Gantcie),
  przewijane w pionie, gdy nie mieszczą się w komórce. Klik na plakietkę → edycja; klik na numer
  dnia → nowy element z domyślną godziną startu 9:00 tego dnia.
- Dostępny jako czwarta zakładka w `/plan-zasobow` (obok Gantt/Lista/Dashboard).

## Etap 5 — Walidacje ✅ Zrobione

- ✅ Silnik `lib/resource-plan/validations.ts` (`validateResourcePlanItem`) — 10 reguł
  ostrzegawczych (konflikt osoby/zespołu, przekroczenie limitu godzin dziennych/tygodniowych,
  brak roli/kompetencji/lidera wymaganych przez etap, brak przypisanej osoby, nachodzenie na
  nieobecność, brak budżetu, wysokie ryzyko).
- ✅ Zintegrowany z panelem edycji (`resource-plan-side-panel.tsx`) — ostrzeżenia widoczne w
  czasie rzeczywistym, checkbox `accepted_risk` wymagany do zapisu przy aktywnych ostrzeżeniach.
- ✅ Prezentacja ostrzeżeń **poza** panelem edycji: plakietka z liczbą ostrzeżeń (kolor zależny od
  obecności `severity: "danger"`) na karcie w widoku listy, mała ikonka na bloku w Gantcie
  (tooltip z treścią), a osobna sekcja „Konflikty i ryzyka” trafiła do Dashboardu (Etap 6) —
  klik na wpis otwiera element w panelu edycji.
- ✅ Reguła „brak kompetencji” uwzględnia teraz `allowsTrainee` — gdy etap dopuszcza ucznia, brak
  wymaganej kompetencji u przypisanej osoby nie generuje już ostrzeżenia (to świadomie
  przyuczanie, nie przeoczenie).

## Etap 6 — Dashboard modułu ✅ Zrobione

- `lib/resource-plan/dashboard-metrics.ts` — `computeResourcePlanDashboardMetrics()`, agregacja
  po stronie klienta z danych już wczytanych przez `useResourcePlanStore().ensureRange()` (patrz
  D18 w `ARCHITEKTURA.md` — świadomie bez dedykowanego repozytorium SQL na poziomie MVP).
  Liczy: sumę elementów/godzin/budżetów, listę nieprzypisanych (brak `assigneeId` i uczestników),
  listę konfliktów (elementy z ostrzeżeniem `severity: "danger"` z tego samego silnika co Etap 5),
  rozkład po statusie, obciążenie godzinowe per osoba z szacowaną wolną zdolnością (limit
  tygodniowy × liczba tygodni okna).
- `components/resource-plan/resource-plan-dashboard.tsx` — nawigacja miesiąc wstecz/w przód (jak
  w liście), 5 kart KPI (`MetricCard`: elementy planu, planowane godziny, budżet robocizny,
  nieprzypisane, konflikty — z kolorem tone zależnym od tego, czy liczba > 0), wykres słupkowy
  „Obciążenie godzinowe per osoba” i kołowy „Elementy wg statusu” (`BarPanel`/`PiePanel` z
  `components/charts.tsx` — istniejący, jedyny moduł wykresów w aplikacji), tabela
  obciążenia/wolnej zdolności per osoba (plakietka „Przeciążenie” / „W normie” / „Brak limitu”),
  lista konfliktów i lista nieprzypisanych — obie klikalne, otwierają `ResourcePlanSidePanel`.
- Dostępny jako czwarta (teraz: obok Kalendarza, piąta) zakładka w `/plan-zasobow`.

## Etap 7 — Sugestie regułowe (bez AI) ✅ Zrobione

- `lib/resource-plan/suggestions.ts` — `suggestResourcePlanCandidates()`, czysta funkcja o
  sygnaturze zbliżonej do `validateResourcePlanItem` (te same dane: `profilesById`,
  `resourceProfilesById`, `dictionaryItems`, `otherItems`, opcjonalny `stage`). Zwraca
  rankingowaną listę kandydatów (`score` 0–100) z wyjaśnieniami (`reasons: string[]`) — patrz D19
  w `ARCHITEKTURA.md` po pełną punktację. Sprawdza: role/kompetencje wymagane przez etap (z
  uwzględnieniem poziomu kompetencji i `allowsTrainee`), `isAvailableForPlanning`, nieobecności w
  terminie, konflikty terminów, przekroczenie dziennego/tygodniowego limitu godzin, bonus za
  członkostwo w wybranym zespole.
- UI: sekcja „Sugerowane osoby” w `resource-plan-side-panel.tsx`, nad wyborem osoby odpowiedzialnej
  — do 5 kandydatów jako klikalne „chipy” z plakietką % dopasowania (zielona/żółta/czerwona),
  liczbą konfliktów i informacją o nieobecności; klik ustawia `assigneeId`. Kandydaci to cała
  lista `teamProfiles` (użytkownicy z dostępem do planowania), nie wymaga dodatkowego zapytania —
  reużywa profile już ładowane przez panel.

## Etap 8 — Przygotowanie pod AI ✅ Zrobione (architektura, bez rzeczywistego dostawcy AI)

- `lib/resource-plan/suggestion-provider.ts` — interfejs `ResourcePlanSuggestionProvider`
  (`id`, `label`, `description`, `getCandidates(params): Promise<ResourcePlanCandidate[]>`),
  **asynchroniczny od początku** mimo że jedyny dziś dostawca (`ruleBasedSuggestionProvider`)
  jest w praktyce synchroniczny — bo przyszły dostawca AI z natury wykonuje wywołanie sieciowe.
  `getActiveSuggestionProvider()` — punkt, w którym docelowo przełączy się aktywny dostawca.
- UI (`resource-plan-side-panel.tsx`) woła wyłącznie `getActiveSuggestionProvider().getCandidates(...)`,
  nigdy silnika regułowego bezpośrednio — podłączenie przyszłego dostawcy AI (np. wywołanie
  modelu z kontekstem projektu/etapu/zespołu, z fallbackiem do silnika regułowego przy błędzie)
  nie wymaga żadnych zmian w komponentach.
- Świadomie **nie** zaimplementowano rzeczywistego wywołania AI (brak zdefiniowanego przez
  właściciela produktu wymogu co do konkretnego modelu/dostawcy) — zakres Etapu 8 z pierwotnego
  planu to *przygotowanie architektury*, co jest zrobione; podłączenie realnego modelu to
  osobna decyzja produktowa (wybór dostawcy, koszt, dane wejściowe) do podjęcia później.

## Braki i dług techniczny do domknięcia w kolejnych iteracjach

- Brak API route'ów `app/api/plan-zasobow/**` — obecnie repo/store wołane wprost z klienta
  (Supabase RLS chroni zapis). Do rozważenia przy potrzebie logiki serwerowej (np. webhooki,
  wywołanie AI po stronie serwera z ukrytym kluczem API).
- Brak testów automatycznych dla `validateResourcePlanItem` i `suggestResourcePlanCandidates` —
  zalecane przed dalszą rozbudową reguł (oba moduły współdzielą tę samą logikę nakładania się
  terminów/godzin, wyeksportowaną z `validations.ts`).
- Dashboard i plakietki ostrzeżeń w liście/Gantcie liczą `validateResourcePlanItem` dla każdego
  widocznego elementu przy każdym renderze (O(n²) względem liczby elementów w oknie) — przyjęte
  świadomie na skalę MVP (patrz D17/D18 w `ARCHITEKTURA.md`); do rewizji, jeśli liczba elementów
  planu w jednym oknie czasowym znacząco wzrośnie (setki+).
- Kolizja numeracji migracji z równoległą pracą nad modułem „Tablica Celów”
  (`098_goals_mvp.sql`, `099_goal_methodologies_seed.sql` używają tych samych numerów co
  `098_resource_plan_dictionaries.sql`/`099_resource_plan_user_extensions.sql`, mimo różnych
  nazw plików) — do przenumerowania przy commitowaniu tamtego modułu (patrz jego dokumentacja).
