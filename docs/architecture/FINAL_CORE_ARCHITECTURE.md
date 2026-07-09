# Final Core Architecture — Rentgen

> Docelowa architektura rdzenia. To jest **fundament**. Po rozpoczęciu implementacji
> React + Supabase kontrakty oznaczone jako „ZAMROŻONE” nie powinny się zmieniać.
> Siostrzane: `ARCHITECTURE_REVIEW.md`, `SCALABILITY_REVIEW.md`, `TECHNICAL_DEBT_REPORT.md`.

---

## 1. Zasady fundamentu

1. **Metodologia = dane wersjonowane.** Kod jest metodologicznie-neutralny.
2. **Jedno źródło prawdy dla katalogu** (`CatalogueRepository`), wersjo-świadome.
3. **Offline liczy i buduje artefakty; runtime tylko czyta i wykonuje audyt.**
4. **Wszystko nosi wersję** (`methodology_version_id`) i **prowenans** (`source_checksum`).
5. **Kontrakty danych są jawne i stabilne** (schematy wejść/wyjść niezależne od implementacji).
6. **Determinizm i audytowalność** na każdym etapie.

---

## 2. Warstwy docelowe (kanoniczne)

```
┌──────────────────────────────────────────────────────────────────────┐
│ L0  CATALOGUE (dane wersjonowane)                                      │
│     docs/sri/catalogue  ──▶  CatalogueRepository (jedno źródło)        │
├──────────────────────────────────────────────────────────────────────┤
│ L1  METHODOLOGY (wersje + strategie + diff)                           │
│     Methodology Version Engine                                         │
├──────────────────────────────────────────────────────────────────────┤
│ L2  CALCULATION (algorytm, metodologicznie-neutralny)                 │
│     sri_engine (compute_sri)  ── strategy registry                    │
├──────────────────────────────────────────────────────────────────────┤
│ L3  ADVISORY (offline, artefakty wersjonowane)                        │
│     Dependency ▶ Recommendation ▶ Optimization                        │
├──────────────────────────────────────────────────────────────────────┤
│ L4  AUDIT EXECUTION (runtime)                                          │
│     Universal Audit Engine (Template ▶ Session ▶ ... ▶ Report)        │
├──────────────────────────────────────────────────────────────────────┤
│ L5  AI ASSISTANT (przekrojowa, doradcza)                             │
│     Decision · Context · Question Selection · Confidence               │
├──────────────────────────────────────────────────────────────────────┤
│ L6  PRESENTATION (React/UI, poza tym etapem)                          │
│     PDF · JSON · API · Dashboard                                       │
└──────────────────────────────────────────────────────────────────────┘
```

Reguła zależności: **wyższa warstwa zna niższą, nigdy odwrotnie.** L2 nie wie o L4/L5.
L4 wywołuje L1–L3 przez kontrakty, nie przez wewnętrzne szczegóły.

---

## 3. Granica OFFLINE ↔ RUNTIME (kluczowa decyzja)

| Element | Offline (build-time, Python) | Runtime (Supabase/React/TS) |
|---|---|---|
| Katalog metodologii | źródło (`docs/sri/catalogue`) | tabele `sri_*` (read-model) |
| Wagi / impact scores | źródło | seed → `sri_*` |
| Grafy dependency/recommendation/optimization | **liczone tutaj** → `generated/<version>/` | seed → tabele read-model |
| Obliczenie SRI (batch/testy) | `sri_engine` | port strategii do runtime **lub** wywołanie usługi liczącej |
| Audyt (sesje, odpowiedzi, evidence) | — | `audit_*` |
| AI Assistant | — | runtime + LLM |

**Zasada:** ciężka wiedza (grafy, ekspanckie karty, expected gain) jest **prekomputowana
offline** i ładowana do runtime jako read-model. Runtime nie przelicza grafów — czyta je.
Runtime liczy **tylko** wynik konkretnej sesji (mały, tani `compute_sri`).

---

## 4. Kontrakty danych — ZAMROŻONE

Poniższe kontrakty są fundamentem. Zmiana = nowa wersja kontraktu (nie modyfikacja w miejscu).

### 4.1 `AssessmentInput` (wejście obliczeń) — ZAMROŻONE
```json
{
  "methodology_version_id": "eu-sri-v4.5",
  "building_type": "non_residential",
  "climate_zone": "north_east_europe",
  "services": { "H-1a": 2, "V-4": 3, "...": 0 }
}
```
Stabilny, wersjonowany kontrakt między L4 (Audit) a L2 (Calculation). Plugin metodologii
(`AUDIT_PLUGIN_ARCHITECTURE.md`) produkuje dokładnie ten kształt.

### 4.2 `CalculationResult` (wynik) — ZAMROŻONE
```json
{
  "methodology_version_id": "eu-sri-v4.5",
  "engine_version": "1.0.0",
  "total_score_percent": 73.96,
  "class": { "label": "C", "number": 3 },
  "per_domain": { "...": {} },
  "per_criterion": { "...": {} },
  "per_service": { "H-1a": { "fl": 2, "fl_max": 4 } },
  "warnings": []
}
```

### 4.3 Nagłówek prowenansu artefaktu — ZAMROŻONE
Każdy artefakt maszynowy (`generated/**`) zaczyna się od:
```json
{
  "methodology_version_id": "eu-sri-v4.5",
  "source_checksum": "fea84a19...",
  "generated_by": "build_recommendations.py",
  "engine_version": "1.0.0",
  "generated_at": "..."
}
```

### 4.4 Layout artefaktów wersjonowanych — ZAMROŻONE
```
docs/sri/catalogue/                     # źródło (per wersja katalogu)
generated/<methodology_version_id>/     # kontrakty maszynowe (seed do runtime)
    dependency_graph.json
    capabilities_catalog.json
    recommendation_graph.json
    expected_gain_model.json
    optimization_rules.json
docs/**                                 # raporty CZYTELNE dla ludzi (nie wejście maszynowe)
```

### 4.5 Model runtime — kanoniczny podział — ZAMROŻONE
- `sri_*` = **read-model katalogu** (per `methodology_version_id`). Tylko odczyt w runtime.
- `audit_*` = **wykonanie** (sesje, odpowiedzi, evidence, wyniki). Zapis w runtime.
- Grafy advisory = tabele read-model zasilane z `generated/<version>/`.
- Odpowiedzi audytu SRI są przechowywane **generycznie** w `audit_answer`
  (mapowanie `question.code = service.code`, wartość = FL), nie w tabelach sri-specyficznych.
  `sri_*` pozostaje wyłącznie katalogiem.

---

## 5. Wersjonowanie end-to-end (przewleczone)

```
MethodologyVersion (L1)
   │  methodology_version_id + source_checksum
   ├─▶ Catalogue read-model (sri_*)          [tag: methodology_version_id]
   ├─▶ generated/<version>/*.json            [nagłówek prowenansu]
   ├─▶ AuditTemplate.methodology_version_id  [przypięcie]
   └─▶ AuditSession snapshot                 [przypięcie + template_checksum]
```

Skutek: obok siebie mogą istnieć EU v4.5 i PL v1.0; sesja liczy się zawsze wersją, do której
jest przypięta; zmiana metodologii nie rusza sesji w toku (zgodnie z `AUDIT_LIFECYCLE.md`).

---

## 6. Orkiestracja buildu (docelowo)

```
build_all(methodology_version_id):
    1. validate catalogue (checksum == manifest)
    2. build dependency   -> generated/<v>/dependency_graph.json (+capabilities)
    3. build recommendation (needs dependency) -> recommendation_graph, expected_gain
    4. build optimization  (needs recommendation) -> optimization_rules
    5. build knowledge     -> service knowledge (independent)
    6. emit seed           -> supabase migration/seed (transakcyjnie)
    guard: każdy krok sprawdza source_checksum wejść (przelicz tylko nieaktualne)
```

Zastępuje ukrytą kolejność i ręczny split seeda (dług D5/D7).

---

## 7. Nazewnictwo — ZAMROŻONE

| Termin | Znaczenie |
|---|---|
| **Company Knowledge Base** | firmowa baza wiedzy (runtime, Supabase, FTS+AI) — `lib/knowledge` |
| **SRI Service Knowledge** | eksperckie karty 54 usług (offline) — `docs/sri/knowledge` |
| **Catalogue** | oficjalne dane metodologii (usługi, wagi, impact scores) |
| **Methodology Version** | wersja metodologii z prowenansem i strategią |
| **Assessment** | pojedyncze obliczenie (wejście→wynik) |
| **Audit Session** | wykonanie audytu (sesja + odpowiedzi + evidence) |

---

## 8. Punkty rozszerzalności (bez zmian rdzenia)

| Rozszerzenie | Mechanizm |
|---|---|
| Nowa metodologia | MethodologyVersion + AuditTemplate + (opcjonalny) plugin |
| Nowa strategia liczenia | wpis w `CalculationRegistry` (algorithm_type) |
| Nowy typ odpowiedzi/evidence | rejestr typów (UAE) |
| Semantyczne wyszukiwanie | impl `KnowledgeSearch` (FTS → hybrid pgvector) |
| Nowy język | `audit_i18n` / `name_pl`/`name_en` w katalogu |

---

## 9. Co zostało ZAMROŻONE (checklista przed React+Supabase)

- [x] `CatalogueRepository` jako jedyne źródło katalogu (zrobione).
- [x] Rdzeń liczący metodologicznie-neutralny (zrobione).
- [ ] `AssessmentInput` / `CalculationResult` jako wersjonowane schematy.
- [ ] Nagłówek prowenansu + layout `generated/<version>/`.
- [ ] Kanoniczny podział `sri_*` (read-model) vs `audit_*` (wykonanie).
- [ ] Wersjonowanie przewleczone przez artefakty i sesje.
- [ ] Orkiestrator buildu + seed transakcyjny.

Pozycje [x] wykonane w tej sesji. Pozycje [ ] to decyzje/implementacje do domknięcia
**przed** startem UI — po przyjęciu tego dokumentu stanowią stabilny fundament.

---

## 10. Werdykt architekta

Projekt ma zdrowy, poprawny rdzeń metodologiczny i dobrze przemyślaną warstwowość. Jedyne
realne ryzyko przed zamrożeniem fundamentów to **organizacja wielu wersji metodologii** oraz
**most offline→runtime** — oba rozstrzygnięte w tym dokumencie na poziomie kontraktów.
Po wdrożeniu pozycji z sekcji 9 fundament jest gotowy na React + Supabase i na wieloletni
rozwój wielometodologiczny bez przebudowy.
