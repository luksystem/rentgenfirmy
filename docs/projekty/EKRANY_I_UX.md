# Ekrany i UX — Moduł Projekty

## 1. Lista projektów (`/projekty`)

`app/projekty/page.tsx` → `components/projects-table.tsx`.

### Widok tabeli (domyślny)

Kolumny m.in.: nazwa, typ, status przepływu, **etap**, priorytet, właściciel kolejnego kroku,
daty kontaktu, link do procesu (`ProjectProcessLink`).

- Klik w wiersz → dialog edycji (`ProjectEditProvider` → `ProjectForm`).
- Przycisk **Dodaj projekt** → ten sam formularz w trybie tworzenia.
- Filtry: `ProjectViewFiltersBar` + zapis w Supabase (`projects_view_filters`).

Filtry URL (np. z dashboardu): `?category=forClosing` — obsługa przez
`ProjectsViewFiltersFromUrl`.

### Widok Kanban

Przełącznik **Tabela / Kanban** w nagłówku listy.

`components/projects-stage-kanban.tsx`:

- **Kolumny** — unikalne tytuły etapów ze wszystkich szablonów procesów reprezentowanych
  na tablicy (projekty po filtrach). Etapy o **tej samej nazwie** z różnych typów projektów
  są **scalane** w jedną kolumnę (wzór: `lib/process/kanban-merge.ts` dla tablic wdrożeń).
- **Karta** — jeden projekt; badge’e: status, aktywność, priorytet, „Do zamknięcia”, „Bez kontaktu”.
- **Drag & drop** — zmiana kolumny wywołuje `setProjectStage` → synchronizacja z procesem.
  Drop jest możliwy tylko na kolumnę, którą dany projekt **ma w swoim** szablonie procesu
  (inaczej brak reakcji — kolumna pochodzi z innego typu projektu).
- Kolumna **„Inne”** — projekty, których aktywny etap nie pasuje do żadnej scalonej kolumny
  (np. stary tekst w `projects.stage` przed sync).

Podpowiedź pod tablicą: *„Przesuń projekt na inny etap — zaktualizuje to aktywny etap procesu projektu.”*

## 2. Formularz projektu

`components/project-form.tsx` — tworzenie i edycja.

### Pole „Etap”

- Lista rozwijana **nie** pochodzi z Ustawień globalnych.
- Etapy ładowane ze **szablonu procesu** dla wybranego **typu projektu**:
  - nowy projekt → live template (`ensureTemplateForProjectType`);
  - edycja → zakotwiczony snapshot procesu projektu (`resolveAnchoredProcessTemplate`).
- Zmiana typu projektu (nowy projekt) przeładowuje listę etapów; jeśli bieżący etap nie
  występuje w nowym szablonie, ustawiany jest pierwszy etap.
- Przy zapisie edycji: jeśli etap się zmienił, `updateProject` synchronizuje `active_stage_id`.

### Inne pola (skrót)

| Pole | Uwagi |
|------|-------|
| Aktywny | Niezależny od statusu przepływu |
| Status przepływu | Kategoria W trakcie / Oczekujące / Zamknięty |
| Powód blokady | Wymagany przy Oczekujących lub gdy !Aktywny i nie Zamknięty |
| Ocena oczekiwania | 3 checkboxy → auto-priorytet Wysoki/Krytyczny |
| Gwarancja | Daty utworzenia, przekazania systemu, czas gwarancji |
| Pola do zamknięcia | closeBlocker, remainingHours, nextAction, closeDeadline |

## 3. Proces projektu (`/projekty/[id]/proces`)

`components/process/project-process-pipeline-section.tsx` → `ProcessPipeline`.

- **Oznacz jako aktywny etap** — ustawia `active_stage_id`; synchronizuje etap w projekcie.
- Bramki etapów (`blocks_next_stage`) — osobna logika; nie mylić z aktywnym etapem.
- Widok klienta: pipeline tylko do odczytu, bez zmiany aktywnego etapu.

## 4. Konfiguracja etapów (`/procesy`)

`components/process/process-template-editor.tsx`:

- Lista etapów szablonu per typ projektu (Dom, Sklep, …).
- Checkbox **„Etap zamykający projekt”** (`forClosing`) — zastępuje dawną flagę „Do zamknięcia”
  z globalnych Ustawień.
- Opis etapu (dla AI), wymagania planu zasobów — panel `ProcessStageResourcePanel`.

W **Ustawieniach** (`/ustawienia`) sekcja etapów projektu została zastąpiona kartą z linkiem
do szablonów procesów.

## 5. Widoki skrótowe

| Trasa | Opis |
|-------|------|
| `/do-zamkniecia` | Tabela projektów na aktywnym etapie zamykającym + status W trakcie/Oczekujące |
| `/oczekujace` | Filtr statusu Oczekujące |
| `/bez-kontaktu` | Reguła dat kontaktu (`lib/domain.ts`) |

Dashboard (**Główne** `/`) — licznik „Do zamknięcia” i link z filtrem `category=forClosing`;
licznik korzysta z tej samej mapy `buildProjectClosingFlagsMap`.

## 6. Filtry kategorii projektów

`lib/projects-view-filters.ts` — kategorie wielokrotnego wyboru:

| ID | Reguła |
|----|--------|
| `active` | `isActive` |
| `inactive` | `!isActive` |
| `inProgress` | status przepływu: W trakcie |
| `waiting` | status przepływu: Oczekujące |
| `closed` | status przepływu: Zamknięty |
| `forClosing` | aktywny etap procesu z `forClosing` + W trakcie/Oczekujące |
| `critical` | priorytet Krytyczny |
| `noContact` | reguła „Bez kontaktu” |

Filtry blokady: `internal` / `external` (flagi powodu blokady w Ustawieniach).

## 7. Raport operacyjny

`/raport` — sekcja „projekty do zamknięcia” i quick winy używają `buildProjectClosingFlagsMap`
(analogicznie do dashboardu).

Pełny opis flag projektu: komentarz w `lib/project-rules.ts` i karta „Zależności flag” na
`/ustawienia`.
