# Specyfikacja: proces zgłoszeń serwisowych (Przyjmij / Rozlicz / Utknięte)

Status: wdrożone w aplikacji (migracja `168_service_intake_workflow.sql`).

## Cele

1. **Przyjmij** — jasne przejęcie odpowiedzialności, opcjonalni zaangażowani, wpis w planie zasobów.
2. **Rozlicz** — wymuszony krótki feedback przed etapem rozliczania.
3. **Utknięte** — osobna ścieżka z formularzem, licznik podejść, powrót do realizacji.
4. **Reklamacje** — poza tym zakresem (osobna tablica później); klient informowany przy transferze.

## Statusy kanbanu

| Status | Etykieta | Znaczenie |
|--------|----------|-----------|
| `new` | Nowe | Czeka na przyjęcie |
| `in_review` | W trakcie | W realizacji |
| `stuck` | Utknięte | Zablokowane; liczy się jako kolejne podejście po wznowieniu |
| `converted` | Rozliczanie | Po feedbacku „Rozlicz” |
| `closed` | Zamknięte | Zakończone |
| `rejected` | Odrzucone | Odrzucone |

## Przyjmij (`new` / `stuck` → `in_review`)

- Brak assignee → przypisz bieżącego użytkownika.
- Inny assignee → potwierdzenie **przejęcia** (zmiana odpowiedzialnego).
- Opcjonalnie: lista **zaangażowanych** (`involved_profile_ids`) — nie zastępuje assignee.
- Po przyjęciu: upsert elementu planu zasobów (`service_intake_request_id`):
  - tytuł: `[Serwis] {reference} — {klient}`
  - assignee = odpowiedzialny
  - uczestnicy = assignee (lead) + zaangażowani
  - w notatce: oznaczenie serwis + nr podejścia / utknięcie jeśli dotyczy

## Rozlicz (`in_review` → `converted`)

Formularz obowiązkowy:

1. Czy problem rozwiązany całkowicie? `full` | `partial` | `none`
2. Co było przyczyną? (tekst)
3. Czy wymagało dodatkowych kosztów? tak/nie + opcjonalna notatka

Zapis w polach: `resolution_outcome`, `resolution_cause`, `extra_costs`, `extra_costs_note`, `feedback_at`.

## Utknięte (`in_review` → `stuck`)

Formularz:

1. Powód utknięcia (tekst wymagany)
2. Co zrobiono w tym podejściu? (opcjonalnie)

Efekty:

- `attempt_count += 1` (przy wejściu w `stuck`)
- assignee **bez zmian** (przejęcie osobno przez Przyjmij / zmianę osoby)
- sync planu: notatka „Utknięte · podejście N”

Wznowienie: `stuck` → `in_review` (Przyjmij / Wznów).

## Pola DB (skrót)

- `involved_profile_ids uuid[]`
- `attempt_count int` (domyślnie 1)
- `resolution_outcome`, `resolution_cause`, `extra_costs`, `extra_costs_note`
- `stuck_reason`, `stuck_notes`
- `feedback_at`

## Reklamacje (nie w tym wdrożeniu)

Osobna tablica Kanban: transfer serwis → reklamacja → powrót + e-mail do klienta.
