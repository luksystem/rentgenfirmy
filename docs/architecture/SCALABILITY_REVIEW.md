# Scalability & Performance Review

> Ocena skalowalności i wydajności rdzenia Rentgen (SRI + Audit + Knowledge).
> Perspektywa: architekt systemów. Siostrzane: `ARCHITECTURE_REVIEW.md`, `FINAL_CORE_ARCHITECTURE.md`.

---

## 1. Wymiary wzrostu

| Wymiar | Dziś | Za 2–3 lata (realistycznie) | Ryzyko |
|---|---|---|---|
| Metodologie | 1 (SRI) | 6–10 (SRI EU/PL, EPBD, ISO, ESG, WELL, LEED, BREEAM, custom) | wysokie (mnożnik) |
| Wersje na metodologię | 1–5 | 3–5 każda | wysokie |
| Usługi/pytania na metodologię | 54 (SRI) | 50–300 (LEED/BREEAM większe) | średnie |
| Sesje audytu | 0 | tysiące/rok | wysokie |
| Evidence (pliki) na sesję | 0 | 20–200 | wysokie (storage) |
| Baza wiedzy (dokumenty) | dziesiątki | tysiące chunków | średnie |

Kluczowy mnożnik: **metodologie × wersje × usługi × zony × typy budynków**. Dla wag domen SRI
to już `2 (BT) × 5 (zon) × 9 (domen) × 7 (kryteriów)`. Przy 8 metodologiach × 4 wersje rośnie
liniowo, ale artefakty statyczne (JSON) tego nie utrzymają czytelnie.

---

## 2. Warstwa offline (Python builders)

### 2.1 Wydajność obliczeń — OK
Silnik SRI to O(usługi × kryteria × domeny) — trywialne (54 × 7 × 9). Buildery liczą expected
gain per (BT × zona × kryterium) — nadal tanie. **Wydajność nie jest problemem.**

### 2.2 Skalowanie danych — wymaga struktury
- Artefakty (grafy JSON) **nie są tagowane wersją** → nie utrzymają wielu metodologii/wersji obok siebie.
- **Rekomendacja:** katalog `generated/<methodology_version_id>/...` + `methodology_version_id`
  i `source_checksum` w każdym artefakcie. Build per wersja, artefakty rozłączne.
- Orkiestrator z checksumem świeżości: przelicza tylko wersje, których wejścia się zmieniły.

### 2.3 Seed do bazy — proces krytyczny
Ręczny podział na 8 chunków (`_split_seed.py`) skaluje się źle: każda nowa wersja metodologii
= kolejny wielki seed do ręcznego wklejania, z ryzykiem kolejności FK.
- **Rekomendacja:** seed przez Supabase CLI/migracje (transakcja, kolejność FK gwarantowana),
  generowany z artefaktów `generated/<version>/`. Zero kopiuj-wklej.

---

## 3. Warstwa runtime (Supabase / Postgres)

### 3.1 Model katalogu SRI (`sri_*`) — read model
- Odczyt katalogu jest rzadki i cache'owalny (zgodnie z regułą `data-fetch-cache`): store +
  `hydrate/ensure`, brak N+1. **Skaluje się dobrze** jako dane referencyjne (read-mostly).
- Przy wielu metodologiach: partycjonowanie logiczne po `methodology_version_id`
  (indeks złożony), zapytania zawsze filtrowane wersją.

### 3.2 Sesje audytu i odpowiedzi (`audit_*`) — hot path
- `audit_answer` rośnie: `sesje × pytania`. Przy tysiącach sesji × setki pytań to setki tysięcy
  wierszy/rok — dla Postgresa niewiele, **pod warunkiem indeksów** `(session_id)`,
  `(session_id, question_id)` i paginacji per sekcja (nie ładować całej sesji naraz).
- Wynik (`audit_calculation_result`) trzymany jako snapshot JSON — unika ponownego liczenia
  przy odczycie raportu. **Dobrze dla skali** (raport = jeden odczyt).

### 3.3 Evidence (Storage)
- Pliki w Supabase Storage, w DB tylko referencje + hash. **Właściwy wzorzec.**
- Ryzyko: koszt storage i transfer przy wideo/BMS. Mitigacja: limity rozmiaru, kompresja
  miniatur, podpisane URL z TTL, lazy-load w UI (poza tym etapem).

### 3.4 Knowledge Base — Full-Text Search
- Wybór świadomy: Postgres FTS (`simple`) + `buildOrTsQuery` (OR keywords). Zalety: prostota,
  brak zależności od modeli embeddingowych.
- **Granice skalowania/trafności:**
  - OR-owy tsquery obniża precyzję przy dłuższych zapytaniach (dużo trafień, słaby ranking).
  - Brak semantyki (synonimy, parafrazy) — „nie działa rekuperator” vs „awaria wentylacji”.
  - Przy tysiącach chunków FTS wydajnościowo OK (GIN index), ale **jakość** wyników spadnie.
- **Rekomendacja (nieblokująca teraz):** zaprojektować interfejs wyszukiwania tak, aby móc
  później dołożyć `pgvector` (embeddingi) jako drugą ścieżkę (hybrid search: FTS + wektory),
  bez zmiany API konsumentów. To decyzja fundamentowa: **abstrakcja `KnowledgeSearch`** z
  wymienną implementacją.

---

## 4. Warstwa AI (Audit Assistant)

- Kontekst budżetowany (P0–P4, rolling summary) — świadomie zaprojektowany pod okno modelu.
- Ryzyko kosztu/latencji: analiza zdjęć/dokumentów per odpowiedź. Mitigacja: cache wyników
  ekstrakcji per `file_hash` (ten sam plik nie analizowany dwa razy), kolejkowanie w tle.
- Deterministyczny core odciąża LLM (mniej wywołań) — dobre dla kosztu i skali.

---

## 5. Wzorce zapytań (zgodność z regułą `data-fetch-cache`)

Rekomendowane dla runtime (obowiązkowe przy implementacji):
- Repozytoria (`lib/supabase/*`): batch (`.in(...)` + `Promise.all`), zero N+1.
- Store (Zustand) + `hydrate/ensure` + dedup in-flight + `force` po mutacji/realtime.
- Katalog metodologii: hydrować raz per wersja, trzymać w cache sesji.
- Sesja audytu: ładować sekcjami; nie pobierać wszystkich odpowiedzi + evidence naraz.

---

## 6. Punkty krytyczne skalowania (priorytety)

| # | Punkt | Wpływ | Rekomendacja | Kiedy |
|---|---|---|---|---|
| S1 | Artefakty bez wersji | blokuje multi-metodologię | `generated/<version>/` + tagi | przed runtime |
| S2 | Ręczny seed | błędy przy każdej wersji | seed przez CLI/migracje | przed runtime |
| S3 | FTS jakość | słabe wyniki przy wzroście | abstrakcja + opcja pgvector | interfejs teraz, impl później |
| S4 | audit_answer wzrost | wydajność odczytu | indeksy + paginacja sekcjami | projekt schematu teraz |
| S5 | Evidence storage | koszt/transfer | limity + TTL + lazy | przy UI |

S1, S2, S4 to decyzje **fundamentowe** (schemat + layout danych) — ustalić teraz.
S3, S5 to decyzje **interfejsu** (zaprojektować rozszerzalnie teraz, implementować później).

---

## 7. Werdykt

Rdzeń obliczeniowy skaluje się bez problemu. Realne ryzyko skalowania to **organizacja danych
wielu metodologii/wersji** (S1/S2) i **jakość wyszukiwania wiedzy** (S3). Wszystkie mają tanie
rozwiązania, jeśli zostaną uwzględnione w fundamencie (patrz `FINAL_CORE_ARCHITECTURE.md`)
przed startem React+Supabase.
