# Moja praca — dokumentacja modułu

Moduł **Moja praca** to osobisty pulpit operacyjny pracownika i managera w Rentgen firmy. Agreguje zadania z wielu modułów (procesy, serwis, ustalenia, plan zasobów itd.) jako wewnętrzne zlecenia (`work_items`) z pełnym workflow.

## Dokumenty

| Plik | Opis |
|------|------|
| [INSTRUKCJA_PRACOWNIK.md](./INSTRUKCJA_PRACOWNIK.md) | Obsługa zadań, rytm dnia, plan tygodnia — dla wykonawcy |
| [INSTRUKCJA_MANAGER.md](./INSTRUKCJA_MANAGER.md) | Tworzenie zadań, pulpit, weryfikacja, plany — dla managera |
| [ARCHITEKTURA.md](./ARCHITEKTURA.md) | Model danych, warstwy, adaptery, uprawnienia |
| [STAN_WDROZENIA.md](./STAN_WDROZENIA.md) | Co jest wdrożone (Etapy 1–5) |
| [CZAS_PRACY.md](./CZAS_PRACY.md) | Dokumentacja modułu Czas pracy — funkcje, API, przepływy |
| [TEST_RECZNY.md](./TEST_RECZNY.md) | Scenariusze testów manualnych |

## Trasy aplikacji

| URL | Widok | Kto |
|-----|-------|-----|
| `/moja-praca/zadania` | Lista / Kanban zadań, plan dnia/tygodnia | Wszyscy |
| `/moja-praca/pulpit` | Dashboard managera (KPI, kolejki) | Manager / admin |
| `/moja-praca/dostepnosc` | Urlopy i dostępność | Wszyscy |
| `/moja-praca/czas-pracy` | Ewidencja czasu, timer, propozycje z planu | Wszyscy |
| `/moja-praca/czas-pracy/arkusz` | Arkusz okresowy, macierz zespołu | Wszyscy / manager |

## Etapy wdrożenia

1. **Etap 1** — `work_items`, workflow, sync Kanban, UI lista/kanban
2. **Etap 2** — plany dnia/tygodnia, sesje, przeszkody, podsumowania
3. **Etap 3** — agregacja wszystkich modułów, edycja/usuwanie, przejęcie zadań
4. **Etap 4** — AI: szkic podsumowania dnia, sugestie zadań, analiza ryzyk planu
5. **Etap 5** — pulpit managera z metrykami i kolejkami reakcji

## Migracje Supabase

`120` → `124` — patrz [STAN_WDROZENIA.md](./STAN_WDROZENIA.md).

## Szybki start (dev)

1. Uruchom migracje `120`–`124` na Supabase.
2. Opcjonalnie: `supabase/seed/work_items_demo.sql` dla danych demo.
3. Wejdź na `/moja-praca/zadania`.
4. Manager: `/moja-praca/pulpit` + tworzenie zadań z dialogu „Nowe zadanie”.
5. AI wymaga `OPENAI_API_KEY` (fallback na reguły bez klucza).

## Kluczowe pliki kodu

```
lib/my-work/              — typy, filtry, adaptery, AI, dashboard metrics
lib/supabase/my-work-*    — serwer, sync, plany, dashboard
store/my-work-store.ts    — cache Zustand
components/my-work/       — UI
app/api/my-work/          — REST API
```
