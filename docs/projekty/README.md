# Moduł Projekty

Dokumentacja sekcji **Projekty** w aplikacji Rentgen — lista projektów, etapy wdrożenia,
powiązanie z procesem, widoki operacyjne i reguły biznesowe.

| Dokument | Zawartość |
|----------|-----------|
| [ARCHITEKTURA.md](./ARCHITEKTURA.md) | Model danych, synchronizacja etap ↔ proces, store, repozytoria |
| [EKRANY_I_UX.md](./EKRANY_I_UX.md) | Ekrany, filtry, Kanban, formularz, widoki „Do zamknięcia” |

## Umiejscowienie w menu

Grupa **Projekty** (`components/app-shell.tsx`):

- `/projekty` — główna lista projektów (tabela / Kanban)
- `/projekty/[id]/proces` — pipeline procesu danego projektu
- `/procesy` — szablony procesów (konfiguracja etapów)
- `/do-zamkniecia` — widok operacyjny projektów na etapie zamykającym

Powiązane widoki spoza grupy: **Główne** (liczniki), **Widoki** (filtry skrótowe), **Raport**.

## Najważniejsza zasada (od 2026)

**Etap projektu** (`projects.stage`) to **denormalizowany alias** aktywnego etapu procesu
(`project_processes.active_stage_id`). Nie ma osobnej globalnej listy etapów w Ustawieniach —
etapy pochodzą ze **szablonu procesu** przypisanego do typu projektu (`process_templates` →
`process_stages`).
