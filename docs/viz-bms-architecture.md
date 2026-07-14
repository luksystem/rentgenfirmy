# Wizualizacje / BMS Command Center — architektura

> Etap 0 — audyt repozytorium i plan wdrożenia (2026-07-14)

## 1. Stan istniejącej aplikacji

### Stack
| Warstwa | Technologia |
|---------|-------------|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Radix UI |
| Backend | Route Handlers (`app/api/**`), brak Server Actions |
| Baza | Supabase Postgres + RLS + pg_cron |
| Hosting | Vercel |
| Wykresy | Recharts 3 |
| Mapy | Leaflet + react-leaflet, geokodowanie Nominatim (`/api/clients/geocode`) |
| Stan UI | Zustand + hydratory + repozytoria (`lib/supabase/*-repository.ts`) |

### Loxone / telemetria
- Integracje w `project_integrations` + hasła w `project_integration_secrets` (szyfrowane AES-256-GCM).
- Odczyt przez `lib/integrations/loxone-client.ts` → `/jdev/sps/io/{virtualInputName}/state`.
- Sync co 5 min: Supabase `pg_cron` → `POST /api/cron/telemetry-sync` → `syncAllActiveIntegrations()`.
- Historia w `project_telemetry` (append-only), ale UI/API eksponują **tylko ostatni snapshot** per integracja.
- **Brak rejestru wielu zmiennych** — jedna `virtualInputName` na integrację w `config_json`.
- Frontend **nie** łączy się z Miniserverem — wymaganie spełnione przez istniejący backend.

### Lokalizacja projektów
- Każdy **projekt** ma `client_id` → adres obiektu pochodzi z **klienta tego projektu** (per projekt / per sklep).
- Współrzędne: geokodowanie runtime (Nominatim), opcjonalny override w `viz_dashboard_projects`.
- Dashboard **nie** tworzy osobnych adresów — tylko metadane BMS.

### Zmienne integracji (wiele punktów Loxone)
- Tabela `project_integration_variables` — dowolna liczba punktów (`source_key`) na integrację.
- Istniejące `virtualInputName` w `config_json` są migrowane automatycznie (migracja 136).
- Sync/test odczytuje **wszystkie aktywne zmienne**; telemetria w `project_telemetry.integration_variable_id`.
- Mapowanie BMS (`viz_variable_mappings`) wskazuje `integration_variable_id`, nie samą integrację.

### Zgłoszenia serwisowe
- Tabela `service_intake_requests` — statusy: `new`, `in_review`, `converted`, `closed`, `rejected`.
- Pola: `project_id`, `priority` (CAFE), `due_at`, `assignee_id`, `metadata_json`, `tracking_token`.
- UI: `/oferty/zgloszenia` (Kanban), publiczny formularz `/zgloszenie`.
- **Braki SLA:** brak `first_response_at`, brak historii eskalacji — SLA oparte tylko na `due_at` i `created_at`.

### Szybkie oferty / kalkulator dojazdu
- Algorytm: `lib/service/calculate-service-cost.ts` + `kilometer-zone.ts` + `travel-context.ts`.
- Ustawienia: `app_settings.id = 'service_global_settings'`.
- **Brak testów jednostkowych** kalkulatora — przy kopiowaniu do modułu serwisowego dashboardu trzeba dodać testy porównawcze.

### Kontakty
- Tabela `contacts` — **brak bezpośredniego FK kontakt↔projekt**.
- Powiązanie: `services.contact_id` + `services.project_id` lub konwersja → `clients`.
- Wymagane rozszerzenie: `project_contacts` (relacja kontakt–projekt z rolami BMS).

### Przeglądy
- Istniejący moduł `/przeglady` — `inspections` z statusami operacyjno-rozliczeniowymi.
- Dashboard BMS będzie korzystał z istniejących przeglądów; osobny moduł BMS-inspections **nie** jest potrzebny na start.

### Czas pracy
- `time_entries` z `project_id`, `service_id`, snapshotami stawek.
- Umowy serwisowe dashboardu będą agregować godziny z tego modułu (Etap 4).

### Dokumenty
- `project_documents` + bucket `project-documents`.
- Faktury energii: wykorzystać ten mechanizm + nowa tabela metadanych analizy AI (Etap 5).

### RBAC
- Role: `administrator`, `manager`, `pracownik`, `podwykonawca`, `klient`, `gosc`.
- Nawigacja: `lib/navigation/nav-modules.ts` + macierz `role_nav_permissions`.
- Projekty: `user_can_access_project()` + `profile_project_access`.
- Moduł Wizualizacje: osobna tabela `viz_dashboard_access` z granularnymi uprawnieniami.

---

## 2. Architektura modułu

```
┌─────────────────────────────────────────────────────────────┐
│  UI: /wizualizacje/*                                        │
│  store/viz-store.ts + VizHydrator                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  API: /api/viz/*                                            │
│  lib/supabase/viz-server.ts                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Repozytorium: lib/supabase/viz-repository.ts               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Supabase: viz_* tabele + RLS                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
 projects            project_integrations   service_intake_requests
 clients             project_telemetry      inspections
 contacts            (sync cron)            time_entries
```

### Warstwa 1 — Silnik Wizualizacji
- `viz_dashboards` — definicja dashboardu (szablon, klient, status, układ)
- `viz_dashboard_projects` — przypisanie projektów + metadane BMS
- `viz_integrated_systems` — słownik systemów
- `viz_project_system_status` — status integracji per projekt
- `viz_variable_roles` — słownik ról semantycznych
- `viz_variable_mappings` — mapowanie integracja/zmienna → rola
- `viz_dashboard_access` — uprawnienia użytkowników

### Warstwa 2 — Szablon Decathlon BMS
- Rekord w `viz_dashboard_templates` (`slug: decathlon_bms`)
- Domyślny `layout_json` z sekcjami KPI, mapa, macierz, serwis
- Seed ról zmiennych i systemów

### Etapy kolejnych migracji (plan)
| Migracja | Zakres |
|----------|--------|
| **135** | Fundament (tabele powyżej) |
| **136** | Zmienne integracji + telemetria per zmienna + cache dashboardu |
| 137 | Alarmy + reguły + rozszerzenie statusu sklepu |
| 138 | Umowy serwisowe + stawki wersjonowane |
| 139 | Kalkulator dojazdu serwisowego + snapshoty |
| 140 | Kontakty projektów + wykresy konfigurowalne |
| 141 | Komendy sterujące + kolejka |
| 142 | Faktury energii + analiza AI |

---

## 3. Routing

| Ścieżka | Widok |
|---------|-------|
| `/wizualizacje` | Lista dashboardów |
| `/wizualizacje/[dashboardId]` | Dashboard (Command Center) |
| `/wizualizacje/[dashboardId]/konfiguracja` | Konfiguracja dashboardu |
| `/wizualizacje/[dashboardId]/projekty` | Projekty i zmienne |
| `/wizualizacje/[dashboardId]/sklep/[projectId]` | Szczegóły sklepu |
| `/wizualizacje/[dashboardId]/wykresy` | Konfigurator wykresów |
| `/wizualizacje/[dashboardId]/umowy` | Umowy serwisowe |
| `/wizualizacje/[dashboardId]/dojazd` | Kalkulator dojazdu |

Menu: grupa **Projekty** → „Wizualizacje”.

---

## 4. Status sklepu (reguły priorytetów — Etap 2)

Priorytet malejący (pierwszy pasujący wygrywa):

1. **Szary** — brak konfiguracji (brak integracji / mapowania)
2. **Szary jasny** — brak komunikacji (Miniserver offline > X min)
3. **Czerwony** — aktywne alarmy krytyczne / alarm
4. **Czerwony** — błędy systemowe > próg
5. **Żółty** — dane nieaktualne / ostrzeżenia
6. **Niebieski** — prowadzone prace (z resource plan / work items — Etap 4)
7. **Zielony** — poprawnie

Zgłoszenia serwisowe **nie** podnoszą alarmu technicznego — osobny wskaźnik w UI.

---

## 5. Ryzyka i ograniczenia

| Ryzyko | Mitygacja |
|--------|-----------|
| Lokalizacja na kliencie, nie projekcie | Resolve project → client; override w metadanych dashboardu |
| Jedna zmienna na integrację Loxone | Mapowanie przez wiele integracji per projekt; rozszerzenie sync w Etap 2 |
| Brak historii telemetrii w API | Nowe tabele + endpointy historyczne (Etap 2) |
| Vercel serverless — brak WebSocket | Kontynuacja modelu cron + polling/API |
| Brak testów kalkulatora ofert | Skopiować z testami porównawczymi (Etap 4) |
| SLA zgłoszeń — brak first response | Pokazać tylko `due_at` / czas od zgłoszenia |
| Role `klient` bez nav | Dostęp przez `viz_dashboard_access` + dedykowany link (Etap 4) |

---

## 6. Konfiguracja pierwszego dashboardu Decathlon (instrukcja — po Etap 1)

1. Uruchom migrację `135_viz_dashboards_foundation.sql`.
2. Zaloguj się jako administrator.
3. Menu **Wizualizacje** → **Nowy dashboard**.
4. Wybierz szablon **Decathlon BMS Command Center**, klienta Decathlon.
5. Dodaj projekty sklepów — lokalizacja pobierze się z klienta projektu.
6. W **Projekty i zmienne** przypisz integracje Loxone do ról (`store_temperature`, `store_setpoint`, …).
7. Ustaw status integracji systemów (BMS, HVAC, …).
8. Opublikuj dashboard (status: aktywny).

Zbieranie danych: istniejący cron telemetrii (`/api/cron/telemetry-sync`) — rozszerzenie multi-variable w Etap 2.
