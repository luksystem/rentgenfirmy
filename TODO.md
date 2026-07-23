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

### [ ] Maile transakcyjne — Resend.com, SMTP własny, klucze API i edytor szablonów

Obecnie wysyłka idzie przez **Resend API** (`lib/email/send.ts`, `RESEND_API_KEY`). Szablony HTML ustaleń są na sztywno w kodzie (`lib/email/agreement-templates.ts`). Bez `RESEND_API_KEY` wysyłka jest pomijana — działa tylko „Otwórz w kliencie poczty”.

**Do zrobienia:**

- [ ] **Resend.com — konfiguracja produkcyjna** — weryfikacja domeny nadawcy, SPF/DKIM/DMARC, `EMAIL_FROM`, limity i monitoring błędów w panelu Resend
- [ ] **Klucze API Resend w aplikacji** — sekcja w ustawieniach (np. `/ustawienia` → integracje) zamiast ręcznej edycji `.env`; szyfrowany zapis w `app_settings`, test wysyłki, status „skonfigurowano / brak klucza”
- [ ] **Własny SMTP** zamiast (lub obok) Resend — nodemailer w `lib/email/send.ts`, zmienne `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- [ ] **Panel konfiguracji poczty** — wybór providera (Resend vs SMTP), test wysyłki, czytelne komunikaty błędów zamiast cichego skip
- [ ] **Jednolite miejsce na integracje** — Resend, SMTP, SMSAPI, `NEXT_PUBLIC_APP_URL`; dokumentacja w `.env.example`
- [ ] **Edytor szablonów HTML na froncie** — szablony maili ustaleń (nagłówek, treść, przyciski akceptacji/dyskusji, stopka z disclaimerem) edytowalne w UI, zapis w DB (np. `app_settings` lub `email_templates`), podgląd przed wysyłką
- [ ] Szablony dla innych typów maili: zgłoszenia serwisowe (`service-intake-server.ts`), ewentualnie oferty serwisowe
- [ ] **Logi wysyłki maili** — historia statusów (queued/sent/failed) analogicznie do SMS (`sms_messages`)

**Pliki startowe:** `lib/email/send.ts`, `lib/email/agreement-templates.ts`, `lib/supabase/agreement-email-server.ts`, `components/dashboard/agreement-delivery-actions.tsx`, `.env.example`

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

### [ ] Dojazd liczony po trasie (routing), nie w linii prostej

Obecnie odległość do klienta (`lib/service/travel-context.ts` → `resolveOneWayDistanceKm`) liczy się jako linia prosta (haversine) między współrzędnymi z geokodowania adresu firmy i klienta (`lib/service/geocode-server.ts`, Nominatim/OpenStreetMap — bez klucza API). To zaniża realny dystans drogowy o ok. 10–20%.

**Do zrobienia:**

- [ ] Dodać wywołanie serwisu routingu zamiast/obok haversine — kandydaci: **OSRM** (darmowy, bez klucza, publiczny serwer demo — najprostszy upgrade w tym samym duchu co obecne rozwiązanie) albo **Google Distance Matrix API** (dokładniejszy dla polskich dróg, ale płatny klucz)
- [ ] Zdecydować, czy zostawić haversine jako fallback, gdy routing nie odpowie
- [ ] Sprawdzić limity/koszt wybranego API przy realnym wolumenie zapytań (AI-wycena wywołuje to przy każdym szacowaniu)

**Pliki startowe:** `lib/service/geocode-server.ts`, `lib/service/travel-context.ts`

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

