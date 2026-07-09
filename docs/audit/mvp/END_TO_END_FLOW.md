# End-to-End Flow — pierwszy pełny przepływ audytu SRI (MVP)

> Cel: od utworzenia audytu do wygenerowania raportu. MVP funkcjonalne — bez stylów, bez
> pełnego UI. Wykorzystuje ZAMROŻONE kontrakty (`AssessmentInput`/`CalculationResult`) oraz
> wersjonowane artefakty z `generated/eu-sri-v4.5/`.

## Mapa przepływu

```
[1] Utworzenie audytu
      POST /api/audit  (name)                              -> status: draft
        |
[2] Wybór metodologii + kontekst budynku
      POST /api/audit/{id}/methodology                     -> status: methodology_selected
        (methodology_version_id, building_type, climate_zone)
        |
[3] Automatyczne wygenerowanie pytań (z metodologii)
      GET  /api/audit/{id}   -> questions[] z katalogu SRI (54 usługi × poziomy 0..FLmax)
        |
[4] Odpowiadanie na pytania
      PUT  /api/audit/{id}/answers  (answers: {code: level}) -> status: in_progress
        |
[5] Dodawanie zdjęć / evidence
      POST /api/audit/{id}/evidence (multipart: file, questionCode, caption)
      GET  /api/audit/{id}/evidence
        |
[6] Calculation Engine
      POST /api/audit/{id}/run  -> liczy CalculationResult (SRI %, klasa, per domena/kryterium)
        |
[7] Recommendation Engine   (część /run)
        -> rekomendacje dla usług z luką (level < FLmax), z ranking/priorytet
        |
[8] Optimization Engine     (część /run)
        -> przypisanie rekomendacji do 5 etapów (stage) wg capability_stage
        |
[9] Roadmap                 (część /run)
        -> uporządkowana sekwencja etapów z listą działań
        |
[10] Raport
      GET  /api/audit/{id}/report  -> złożony raport (wynik + rekomendacje + roadmap)  status: completed
```

Kroki 6–9 wykonuje jedno wywołanie `POST /run` (atomowo, wynik zapisany w `audit_results`).
Krok 10 to złożenie zapisanych wyników w jeden obiekt raportu (idempotentny odczyt).

## Warstwy

| Warstwa | Element | Źródło danych |
|---|---|---|
| Kontrakty | `AssessmentInput`, `CalculationResult` | `schemas/*.json` (frozen) |
| Dane metodologii | katalog SRI, wagi, scores, klasy | `generated/eu-sri-v4.5/**` (odczyt na serwerze) |
| Rekomendacje | graf rekomendacji + expected gain | `generated/eu-sri-v4.5/recommendation-graph.json` |
| Optymalizacja | etapy + capability_stage | `generated/eu-sri-v4.5/optimization-rules.json` |
| Stan audytu | sesja, odpowiedzi, evidence, wyniki | Supabase (`audit_*`) |

> Uwaga MVP: dane metodologii czytamy z artefaktów `generated/` (samowystarczalne, w repo),
> a nie z tabel `sri_*`. Kontrakty są te same, więc podmiana źródła (na DB) nie zmieni API.

## Definicja „done" dla MVP

- Można utworzyć audyt, wybrać metodologię, dostać pytania, odpowiedzieć, dodać zdjęcie,
  uruchomić obliczenia i zobaczyć raport z: wynikiem %, klasą, rekomendacjami i roadmapą.
- Wynik SRI jest zgodny z silnikiem referencyjnym (parytet z `store/SRI/engine`).
