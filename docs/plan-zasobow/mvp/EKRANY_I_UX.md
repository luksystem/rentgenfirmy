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

## 4. Plan Zasobów — widok listy (`/plan-zasobow`)

`components/resource-plan/resource-plan-list.tsx`. Bieżący, zaimplementowany widok MVP —
**lista**, nie Gantt (patrz `STAN_WDROZENIA.md` — uzasadnienie i plan rozbudowy).

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
- Przycisk „Nowy element planu” otwiera panel w trybie tworzenia.
- Stan pusty: karta z komunikatem „Brak zaplanowanych elementów w tym miesiącu.”

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

## 6. Planowane, niezaimplementowane jeszcze widoki (Etapy 4-rozszerzenie / 6)

| Widok | Ścieżka (propozycja) | Zakres |
|---|---|---|
| Gantt / RTM | `/plan-zasobow/gantt` | Wiersze: użytkownicy/zespoły/projekty. Kolumny: dni/tygodnie/miesiące. Bloki kolorowane statusem/ryzykiem, przeciąganie zmiany terminu (natywny HTML5 DnD, wzorem `lib/process/kanban-drag.ts`), tooltip ze szczegółami, szybki podgląd + otwarcie panelu bocznego (reużycie `resource-plan-side-panel.tsx`). |
| Kalendarz | `/plan-zasobow/kalendarz` | Widok miesiąc/tydzień, elementy planu jako wydarzenia. W aplikacji nie ma biblioteki kalendarza — do wyboru: własny komponent siatki (wzorem `process-milestone-dates-panel.tsx`, ale z rozkładem miesiąca) albo lekka biblioteka (do ustalenia z właścicielem produktu). |
| Dashboard modułu | `/plan-zasobow/dashboard` | Karty KPI (Recharts) — obciążenie firmy/zespołu/osoby, liczba konfliktów, zadania zagrożone, wolna zdolność, nieprzypisane projekty/zadania, planowany budżet robocizny. Patrz `STAN_WDROZENIA.md` Etap 6. |

Wszystkie trzy widoki mogą reużyć istniejącą warstwę danych (`store/resource-plan-store.ts`,
`lib/resource-plan/validations.ts`) bez zmian w modelu — to był jeden z celów budowy MVP jako
listy najpierw.
