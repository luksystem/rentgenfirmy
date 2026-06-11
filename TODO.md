# Backlog — na później

Lista rzeczy odłożonych na później. Po zrobieniu odhacz punkt (`[x]`) i ewentualnie dopisz datę w komentarzu.

---

## Moduły

### [ ] Interaktywne kalkulacje sprzedażowe

Osobny moduł w grupie **Oferty**, niezależny od szybkiego rozliczania serwisowego (`/oferty`).

- **Nazwa w UI:** Kalkulacje sprzedażowe
- **Trasa (placeholder):** `/kalkulacje`
- **Definicja modułu:** `lib/modules/commercial-modules.ts` → `salesCalculations`
- **Strona placeholder:** `app/kalkulacje/page.tsx`

**Zakres (do doprecyzowania przy starcie):**

- [ ] Model danych — kalkulacje, warianty, pozycje, cenniki Smart Home
- [ ] UI tworzenia i edycji interaktywnej wyceny
- [ ] Publiczny link dla klienta (podobnie jak `/oferta/[token]`, ale pod kalkulacje)
- [ ] Akceptacja / prośba o konsultację / odrzucenie po stronie klienta
- [ ] Integracja z klientami i projektami (jeśli potrzebna)
- [ ] Ustawienie `available: true` w `commercial-modules.ts` po uruchomieniu modułu

---

### [x] Tablice wdrożeń (hub Kanban per klient)

Widok skrócony do tablic Kanban — bez przechodzenia przez listę projektów.

- [x] Trasa `/tablice-wdrozen` — kafelki klientów z liczbą otwartych zgłoszeń
- [x] Trasa `/tablice-wdrozen/[clientId]` — tablice wdrożeń danego klienta (per projekt)
- [x] Trasa `/tablice-wdrozen/zbiorcza` — jedna tablica ze wszystkich projektów (kolumny łączone po nazwie, etykieta projektu na karcie)
- [x] Pozycja w menu (np. „Tablice wdrożeń”)
- [x] Zapytanie agregujące: `clients` → `projects` → `project_process_items` (kind=kanban) → `process_kanban_boards`
- [x] Reużycie `ProcessKanbanBoard` po wejściu w wybraną tablicę
- [x] Klient z wieloma projektami — lista projektów na kafelku / ekranie pośrednim

---

## Inne

### [ ] Uprawnienia wg ról użytkowników

Na razie **administrator** i **manager** mają pełny dostęp do aplikacji. Role `pracownik`, `klient`, `gość` też mogą korzystać z aplikacji — granularne ograniczenia do wdrożenia później.

- [ ] Macierz uprawnień per moduł (projekty, oferty, zlecenia, raport, admin)
- [ ] Ograniczenie tras i akcji API wg roli
- [ ] Aktualizacja RLS w Supabase (`auth.uid()` zamiast otwartych polityk)

### [ ] Edycja szablonów procesów w UI

- [x] Edytor etapów, kamieni milowych i elementów w `/procesy/[typ]` (MVP)
- [x] Dodawanie checklist, protokołów odbioru, rozliczeń
- [ ] Przypisanie domyślnej osoby odpowiedzialnej per element szablonu

### [ ] Proces projektu — pełna realizacja (dane per projekt)

Obecnie: szablon globalny + w `project_processes.completions` tylko proste odhaczenie (data, kto). Brak treści checklist/protokołów, podpisów i raportu końcowego.

**Cel:** każdy element procesu zapisuje się trwale dla danego projektu; na końcu raport kompletności ze wszystkimi dokumentami.

**Model danych (propozycja):**

| Obszar | Tabele / pola |
|--------|-----------------|
| Szablon | `process_items.default_assignee_id` (opcjonalnie) |
| Instancja elementu | `project_process_items` — `project_id`, `template_item_id`, `assignee_id`, `status`, `payload` (jsonb: punkty checklisty, pola protokołu, załązniki) |
| Podpis wewnętrzny | `project_process_item_signatures` — `user_id`, `signed_at`, `signature_data` / potwierdzenie |
| Wymagania klienta | `project_client_requirements` — lista pozycji per projekt |
| Realizacja wymagań | `project_requirement_completions` — odhaczenie, notatka, status |
| Podpisy wymagań | `project_requirement_signatures` — strona: `company` \| `client`, token/link dla klienta |
| Raport końcowy | generowany z powyższych + PDF / widok `/projekty/[id]/proces/raport` |

**Typy elementów (`payload` wg `kind`):**

- **checklist** — lista punktów `{ id, text, checked, checkedAt, checkedBy }`
- **protocol** — pola formularza, zdjęcia/pliki, podpis odpowiedzialnego + podpis klienta (link publiczny)
- **settlement** — powiązanie z ofertą serwisową / kosztem, status rozliczenia

**Fazy wdrożenia:**

1. [x] Migracja + `project_process_items` z checklistą (punkty + zapis per projekt)
2. [x] Osoba odpowiedzialna + podpis wewnętrzny przy elemencie
3. [ ] Protokoły z formularzem i podpisem klienta (link `/proces/...` lub `/odbior/...`)
4. [ ] Moduł wymagań klienta na projekcie + odhaczenia i notatki
5. [ ] Podwójne podpisy wymagań (firma + klient)
6. [ ] Raport kompletności procesu + eksport PDF ze wszystkimi załącznikami

**Uwagi techniczne:**

- Szablon nadal edytowalny globalnie; instancje projektów nie nadpisują szablonu (snapshot przy starcie procesu lub lazy init przy pierwszym wejściu).
- Po zmianie szablonu projekty w toku zachowują swoje instancje (już naprawione: zapis szablonu nie usuwa rekordu FK).
- Podpis klienta — wzorować na `/oferta/[token]` (token, ważność, audit log).

