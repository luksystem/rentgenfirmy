# MVP Screen List — minimalne ekrany

> Bez stylów, bez designu. Ekrany służą wyłącznie do przejścia całego procesu. Wszystkie pod
> ścieżką `/audyt`. Klient woła API z `docs/audit/mvp/API_SPEC.md`.

## S1. Lista audytów + utworzenie — `/audyt`
- Formularz: nazwa audytu → `POST /api/audit`.
- Tabela istniejących audytów: nazwa, status, data → link do `/audyt/{id}`.
- Cel kroku 1 z flow.

## S2. Kreator audytu — `/audyt/{id}`
Jeden ekran, sekcje warunkowane statusem (state machine):

### S2a. Wybór metodologii (status: draft)
- Select metodologii (na razie 1: `eu-sri-v4.5`).
- Select `building_type` (residential / non_residential).
- Select `climate_zone` (5 stref).
- Przycisk „Zapisz metodologię" → `POST /api/audit/{id}/methodology`.
- Kroki 2–3 z flow.

### S2b. Pytania i odpowiedzi (status: methodology_selected / in_progress)
- Lista pytań (54 usługi) pogrupowana po domenach.
- Każde pytanie: nazwa usługi + `<select>` poziomu 0..FLmax (z opisami poziomów).
- Sekcja evidence per pytanie: input pliku + podpis → `POST /api/audit/{id}/evidence`.
- Przycisk „Zapisz odpowiedzi" → `PUT /api/audit/{id}/answers`.
- Kroki 4–5 z flow.

### S2c. Uruchomienie obliczeń (status: in_progress)
- Przycisk „Uruchom obliczenia (Calc → Rec → Opt → Roadmap)" → `POST /api/audit/{id}/run`.
- Kroki 6–9 z flow.

### S2d. Raport (status: completed)
- Wynik: SRI %, klasa (A–G).
- Tabela per domena / per kryterium.
- Lista rekomendacji (luka, priorytet, oczekiwany zysk).
- Roadmap: 5 etapów z przypisanymi działaniami.
- Dane z `GET /api/audit/{id}/report`.
- Krok 10 z flow.

## Nawigacja
- `/audyt` → `/audyt/{id}` (jeden przycisk/link).
- Brak integracji z głównym menu na tym etapie (świadomie — MVP). Wejście po URL.

## Poza zakresem MVP
- Style, responsywność, walidacja pól w UI (poza minimum), realtime, cache store (Zustand),
  AI Audit Assistant, wielojęzyczność, uprawnienia per rola (poza „zalogowany").
