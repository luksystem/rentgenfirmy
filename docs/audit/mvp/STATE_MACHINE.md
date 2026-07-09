# State Machine — sesja audytu (MVP)

## Statusy

| Status | Znaczenie | Wejście |
|---|---|---|
| `draft` | audyt utworzony, brak metodologii | `POST /api/audit` |
| `methodology_selected` | wybrana metodologia + kontekst budynku | `POST /{id}/methodology` |
| `in_progress` | zapisano co najmniej jedną odpowiedź | `PUT /{id}/answers` |
| `completed` | policzone wyniki + dostępny raport | `POST /{id}/run` |

## Diagram przejść

```
        POST /audit
            │
            ▼
        ┌───────┐   POST /methodology   ┌───────────────────────┐
        │ draft │──────────────────────▶│ methodology_selected  │
        └───────┘                       └───────────┬───────────┘
            ▲  ▲                                     │ PUT /answers
            │  │ POST /methodology (zmiana)          ▼
            │  └─────────────────────────────┌───────────────┐
            │       PUT /answers             │  in_progress   │
            │  (dozwolone, aktualizuje)  ┌──▶└──────┬─────────┘
            │                            │          │ POST /run
            │                            │          ▼
            │                            │    ┌───────────┐
            └────────────────────────────┴────│ completed │
                POST /run (przelicz ponownie)  └───────────┘
                     (idempotentne)
```

## Reguły przejść (guardy)

- `draft → methodology_selected`: wymaga `methodology_version_id` ∈ {`eu-sri-v4.5`},
  `building_type` ∈ {residential, non_residential}, `climate_zone` ∈ 5 stref.
- `methodology_selected → in_progress`: pierwsza zapisana odpowiedź (walidna wg katalogu).
- `in_progress → completed`: `POST /run` — wymaga ≥1 odpowiedzi; przechodzi walidację
  `AssessmentInput` (kody usług i zakresy poziomów).
- `completed → completed`: ponowne `POST /run` (przeliczenie) lub `PUT /answers` (cofa do
  `in_progress`, wymusza ponowny `/run`).
- `methodology_selected/in_progress/completed → methodology_selected`: zmiana metodologii
  (dozwolona; unieważnia wyniki — należy ponowić `/run`).

## Niezmienniki

- Raport (`GET /report`) dostępny tylko przy statusie `completed`; w innych → 409.
- Zmiana odpowiedzi po `completed` przełącza status na `in_progress` (wyniki nieaktualne).
- Evidence można dodawać w `methodology_selected` / `in_progress` / `completed` (nie zmienia statusu).

## Egzekwowanie

- Status przechowywany w `audit_sessions.status` (CHECK constraint).
- Przejścia realizowane w warstwie API + repozytorium (jedno miejsce zmiany statusu na krok).
