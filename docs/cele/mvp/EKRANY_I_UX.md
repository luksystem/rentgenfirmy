# Ekrany i UX — Tablica Celów

> Zależność: `ARCHITEKTURA.md` (model danych, decyzje D1–D14).

## 1. Mapa ekranów

| # | Ekran | URL | Opis |
|---|---|---|---|
| 1 | Lista tablic celów | `/tablice-celow` | Lista **wszystkich tablic** (wiele per typ, D1), grupowana wizualnie po `kind` (kafelki typów: Sprzedażowe / Projektowe / Serwisowe / Jakości / Rozwojowe / Finansowe / Zarządu¹ / Marketingowe / Szkoleniowe), z licznikami (aktywne / zagrożone / do przeglądu). Przycisk „Nowa tablica” (nazwa + typ). Kafelki-linki do: Widoku zbiorczego, Biblioteki metodologii, Podsumowania, Historii i wniosków. |
| 2 | Widok tablicy | `/tablice-celow/[boardId]` | Kolumny = **status** (Planowanie → W realizacji → Zagrożony → Wstrzymany → Rozliczony, D2). Karty celów z filtrami (właściciel, poziom, priorytet, okres). Przycisk „Nowy cel” (wizard z AI). |
| 3 | Widok celu | `/tablice-celow/[boardId]/[goalId]` | Nagłówek (status/%/priorytet/cykliczność). Zakładki: **Przegląd** (opis, pola metodologii, KPI, powiązania), **Historia** (log zmian `goal_updates` — techniczny, per cel), **Komentarze**, **Przeglądy** (harmonogram + zamykanie, D6), **Rozliczenie** (aktywne po zakończeniu okresu). |
| 4 | Widok zbiorczy | `/tablice-celow/zbiorcza` | Wszystkie cele ze wszystkich tablic (uwzględniając widoczność D5), filtrowanie/grupowanie po poziomie, statusie, okresie, właścicielu, tablicy. |
| 5 | Biblioteka metodologii | `/tablice-celow/metodologie` + `/metodologie/[code]` | Lista kart + karta szczegółowa (opis, przeznaczenie, kiedy/kiedy nie, struktura, przykład, dobre praktyki, błędy). |
| 6 | Podsumowanie realizacji | `/tablice-celow/podsumowanie` | **Stan bieżącego okresu**: % realizacji per zespół/osoba/typ tablicy, rozkład status/priorytet, cele „na czerwono” wymagające uwagi. |
| 7 | **Historia i wnioski** (D7) | `/tablice-celow/historia` | **Analiza longitudinalna** (nie techniczny log): kto dowozi cele (ranking wg % osiągniętych), jakie cele nie są dowożone (lista `not_achieved` z filtrami), kto w ogóle ustala sobie cele (aktywność tworzenia per osoba/zespół w czasie), trend realizacji w czasie (wykres). Patrz sekcja 3. |

¹ Tablice typu „Zarząd” — widoczne tylko dla administratora (D5), do momentu wdrożenia pełnej
matrycy uprawnień.

## 2. Tworzenie celu (wizard) — `goal-create-wizard.tsx`

1. **Opis** — pole tekstowe, użytkownik wpisuje cel w naturalnym języku
   (np. „Chcemy skrócić czas realizacji projektu z 8 do 6 miesięcy”).
2. **Propozycja AI** — metodologia + uzasadnienie + alternatywy + ostrzeżenie o
   ogólności/niemierzalności (patrz `AI_I_METODOLOGIE.md`).
3. **Edycja struktury** — użytkownik akceptuje/zmienia: pola metodologii, KPI, sposób
   monitorowania, częstotliwość przeglądów, ryzyka, proponowane inicjatywy/zadania/zasoby/budżet
   (zapisywane jako `goal_initiatives`, status `proposed` — **bez** automatycznego tworzenia zadań).
4. **Dane podstawowe** — nazwa, właściciel, uczestnicy, tablica, poziom (firma/zespół/osoba),
   priorytet, okres (dzienny/tygodniowy/miesięczny/kwartalny/roczny), daty, **cykliczność**
   (checkbox „Cel cykliczny — po rozliczeniu utwórz automatycznie następny okres”, D4),
   powiązania (projekt/klient/proces/etap/kamień milowy), opcjonalny `parent_goal_id`
   („ten cel wspiera...”, D3 — bez rollupu).

## 3. Ekran „Historia i wnioski” — specyfikacja (D7)

To nowy, samodzielny ekran analityczny (nie dashboard pojedynczego celu). Sekcje:

1. **Ranking dowożenia celów** — per osoba/zespół: liczba celów rozliczonych jako `achieved` /
   `partially_achieved` / `not_achieved`, % skuteczności, trend względem poprzedniego okresu.
2. **Cele niedowiezione** — lista celów `settlement_status = 'not_achieved'` z filtrami
   (typ tablicy, poziom, okres, właściciel) + skrócone `settlement_what_failed` / `settlement_conclusions`.
3. **Aktywność ustalania celów** — liczba celów utworzonych per osoba/zespół w czasie
   (odpowiedź na „kto w ogóle ustala sobie cele”) — pomaga wykryć osoby/zespoły, które nie
   korzystają z narzędzia.
4. **Trend w czasie** — wykres (Recharts) % realizacji / liczby celów per okres.
5. **Wnioski z rozliczeń** — agregacja tekstowa `settlement_conclusions` (lista, docelowo
   grupowana po tablicy/typie), pomaga wychwycić powtarzające się przyczyny niepowodzeń.

Źródło danych: `lib/supabase/goal-history-repository.ts` — zapytania agregujące po
`goals.owner_id` / `goals.created_by` / `goals.settlement_status` / `goals.period_start/end`,
bez N+1 (batch/`group by` po stronie SQL, nie w pętli JS).

## 4. Karta celu — zawartość (dashboard)

Zgodnie z wymaganiami: status, % realizacji, właściciel, osoby zaangażowane, aktualny okres,
liczba powiązanych zadań (`goal_links` gdzie `linked_type='kanban_task'`), liczba otwartych
problemów (`goal_links` gdzie `linked_type='problem'`, docelowo — moduł Problemów jeszcze nie
istnieje), termin kolejnego przeglądu (najbliższy `goal_reviews.scheduled_at` bez `completed_at`),
znacznik cykliczności (ikona/tooltip jeśli `is_recurring = true`).

## 5. Integracja kontekstowa (bez nowego modułu w menu)

- Nowa zakładka **„Cele”** w `ClientDashboardView` (dashboard klienta/zespołu) — lista celów
  powiązanych z danym `project_id`/`client_id`, analogicznie do istniejącej zakładki „Proces”.
- Link „Cele projektu” z widoku projektu.
- Filtrowanie widoku zbiorczego (#4) po `project_id`/`client_id` z linku kontekstowego.
