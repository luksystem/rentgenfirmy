# Architecture Review — Rentgen / SRI + Audit Core

> Przegląd architektoniczny klasy enterprise. Zakres: wszystkie dotychczasowe moduły silnikowe.
> Perspektywa: architekt systemów. Data przeglądu: bieżąca sesja.
> Dokumenty siostrzane: `SCALABILITY_REVIEW.md`, `TECHNICAL_DEBT_REPORT.md`, `FINAL_CORE_ARCHITECTURE.md`.

---

## 1. Zakres i metoda

Ocenione moduły (stan faktyczny w repo, nie deklaracje):

| Moduł | Lokalizacja | Warstwa | Stan |
|---|---|---|---|
| Knowledge Engine | `lib/knowledge/*`, `store/knowledge-store.ts`, `lib/supabase/knowledge-*`, `app/baza-wiedzy`, `app/api/knowledge` | runtime (TS/Supabase) | wdrożony |
| SRI Calculation Engine | `store/SRI/engine/*` | offline (Python) | zwalidowany |
| Dependency Engine | `store/SRI/dependency/*` → `docs/sri/dependency/*` | offline → artefakty | gotowy |
| Recommendation Engine | `store/SRI/recommendation/*` → `docs/sri/recommendation/*` | offline → artefakty | gotowy |
| Optimization Engine | `store/SRI/optimization/*` → `docs/sri/optimization/*` | offline → artefakty | gotowy |
| Methodology Version Engine | `store/SRI/methodology/*` → `docs/sri/methodology/*` | offline → artefakty | gotowy |
| Universal Audit Engine | `docs/audit/*` (+ `docs/audit/ai/*`) | projekt | tylko dokumentacja |

Metoda: analiza kodu i artefaktów (loadery, stałe, zależności między builderami, model danych),
identyfikacja duplikacji/couplingu/ryzyk, ocena i rekomendacja architektury docelowej.

---

## 2. Ocena syntetyczna

| Wymiar | Ocena | Komentarz |
|---|---|---|
| Poprawność metodologiczna (SRI) | ★★★★★ | silnik zwalidowany, wyniki stabilne, prowenansy zachowane |
| Separacja odpowiedzialności (koncepcyjna) | ★★★★☆ | warstwy dobrze rozdzielone w projekcie UAE/Methodology |
| Separacja w implementacji (offline) | ★★★☆☆ | duplikacja loaderów i stałych, ukryta kolejność buildów |
| Wersjonowanie (spójność end-to-end) | ★★★☆☆ | Version Engine istnieje, ale nie przewleczony przez wszystkie silniki |
| Most offline → runtime | ★★☆☆☆ | niezdefiniowany; główne ryzyko przed zamrożeniem fundamentów |
| Skalowalność danych | ★★★☆☆ | patrz `SCALABILITY_REVIEW.md` |
| Utrzymywalność | ★★★☆☆ | brak orkiestracji buildów, artefakty jako źródło prawdy |

Wniosek nadrzędny: **rdzeń metodologiczny jest solidny; ryzyko leży w „dwóch światach”
(offline Python vs runtime TS/Supabase) i w niepełnym przewleczeniu wersjonowania.**
To trzeba rozstrzygnąć teraz, przed implementacją React+Supabase.

---

## 3. Znaleziska — duplikacja

### 3.1 Wiele niezależnych loaderów katalogu  ✅ NAPRAWIONE TERAZ
Przed przeglądem katalog był wczytywany osobnym kodem w co najmniej 7 miejscach
(`sri_engine`, `_build_catalogue`, `build_knowledge`, `build_dependencies`,
`build_recommendations`, `methodology_engine`, `_gen_seed_sql`) — każde z własną ścieżką
(`BASE`/`CAT`/`CATALOGUE`) i własnym parsowaniem.

**Działanie w tej sesji:** wprowadzono `store/SRI/_common/catalogue.py` — jeden,
wersjo-świadomy `CatalogueRepository`. Rdzeń (`sri_engine`) przełączony na niego; wynik
walidacji identyczny (44.29% E / 93.54% A / 73.96% C / 91.71% A, wszystko PASS).
Pozostałe buildery do migracji na wspólny loader — patrz `TECHNICAL_DEBT_REPORT.md` (dług planowy).

### 3.2 Zahardkodowane stałe metodologii  ✅ NAPRAWIONE (rdzeń)
`CRITERIA`, `KEY_FUNCTIONALITIES`, `BUILDING_TYPES`, `CLIMATE_ZONES` były wpisane na sztywno
w `sri_engine.py`, a osobne kopie w `_validate.py` i `_extract.py`. To wprost kłóci się z celem
wieloметодologiczności (inna metodologia może mieć inne kryteria).

**Działanie w tej sesji:** stałe w rdzeniu są teraz **wyprowadzane z katalogu**
(`impact-criteria.json`, `key-functionalities.json`, `import-manifest.json`) przez wspólny
loader. Silnik stał się metodologicznie-neutralny bez zmiany wyników. Kopie w
`_validate.py`/`_extract.py` to skrypty jednorazowe (pre-katalog) — dług zaakceptowany.

### 3.3 Powielone słowniki PL (domeny/kryteria)
`DOMAIN_PL`/`CRITERION_PL` powtarzają się w kilku builderach (`build_recommendations`,
`build_optimization`). Docelowo: jedno źródło tłumaczeń (spójne z `audit_i18n`).

---

## 4. Znaleziska — zależności i coupling

### 4.1 Ukryta kolejność buildów (implicit pipeline)
Zależność faktyczna: `dependency → recommendation → optimization`, a `recommendation`/
`optimization` czytają **wygenerowane artefakty** (`SRI_DEPENDENCY_GRAPH.json`,
`SRI_RECOMMENDATION_GRAPH.json`). `build_optimization` rozszerza `rec_validation`.
Brak jawnego orkiestratora — poprawność zależy od uruchomienia w kolejności ręcznie.

**Ryzyko:** regeneracja jednego artefaktu bez pozostałych → niespójność.
**Rekomendacja:** jeden orkiestrator buildu (`build_all`) z jawnym DAG + walidacją świeżości
(checksum wejść). Patrz `FINAL_CORE_ARCHITECTURE.md`.

### 4.2 Artefakty jako źródło prawdy
Grafy JSON w `docs/sri/**` są jednocześnie „dokumentacją” i „danymi wejściowymi” kolejnych
silników. To myli warstwy: dokument vs kontrakt danych. Docelowo rozdzielić:
`docs/**` = raporty ludzkie; `catalogue/**` + `generated/**` = kontrakty maszynowe wersjonowane.

### 4.3 Coupling przez `eng.CRITERIA` itp.
Buildery importują stałe z modułu silnika (`eng.CRITERIA`, `eng.BUILDING_TYPES`). Po refaktorze
źródłem jest katalog, ale zależność „builder → moduł silnika po stałe” pozostaje. Docelowo
buildery powinny brać stałe z `_common.catalogue`, nie z silnika liczącego (rozdział
„stałe metodologii” od „algorytmu liczenia”).

---

## 5. Znaleziska — wersjonowanie

### 5.1 Version Engine nieprzewleczony przez silniki
`Methodology Version Engine` potrafi wersjonować i porównywać metodologie, ale:
- `sri_engine.Catalogue` ładuje **jedną** wersję katalogu (domyślną),
- grafy dependency/recommendation/optimization są budowane dla **jednej** wersji i **nie są
  tagowane** wersją w nazwie/treści.

**Skutek:** dziś nie da się trzymać obok siebie artefaktów SRI EU v4.5 i SRI PL v1.0.
**Rekomendacja:** każdy artefakt maszynowy nosi `methodology_version_id` + `source_checksum`;
ścieżki wyjściowe wersjonowane (`generated/<version>/...`). To fundament pod multi-metodologię.

### 5.2 Brak jawnego kontraktu wejścia obliczeń
`compute_sri` przyjmuje `{building_type, climate_zone, services:{code:FL}}` — kontrakt istnieje
w kodzie, ale nie jako wersjonowany schemat. Przy runtime (Audit → Calculation) potrzebny
stabilny, wersjonowany `AssessmentInput` schema.

---

## 6. Znaleziska — utrzymanie

- **Seed dzielony ręcznie na 8 chunków** (`_split_seed.py` → `supabase/seed/096_chunks/*`) z
  powodu limitów edytora SQL. Krucha procedura (kolejność FK, ręczne wklejanie). Docelowo:
  seed przez CLI/migrację, nie kopiuj-wklej.
- **Ścieżki zależne od cwd** w `_validate.py`/`_extract.py` (`open("raw/...")`). Skrypty
  jednorazowe, ale warto oznaczyć/odizolować.
- **Dwa znaczenia „knowledge”**: runtime „Baza wiedzy” (Supabase, firmowa) vs „SRI expert
  knowledge cards” (offline JSON). Kolizja nazewnicza — patrz sekcja 7.

---

## 7. Granice modułów (rozjaśnienie)

| Nazwa | Co to jest | Gdzie |
|---|---|---|
| Knowledge Engine (Baza wiedzy) | firmowa baza wiedzy + FTS + AI, runtime | `lib/knowledge`, Supabase |
| SRI Knowledge Cards | ekspercki opis 54 usług (16 pól), offline | `docs/sri/knowledge` |

To dwie różne rzeczy. AI Audit Assistant korzysta z obu, ale muszą mieć **rozłączne nazwy i role**
w architekturze docelowej (np. „Company Knowledge Base” vs „SRI Service Knowledge”).

---

## 8. Co jest dobre (zostawić bez zmian)

- Metodologiczny rdzeń SRI (renormalizacja wag, agregacja, klasy) — poprawny i zwalidowany.
- Prowenansy (`source_type`, `source_checksum`, `import-manifest`) — wzorowe.
- Warstwowy projekt UAE + Methodology Version Engine — właściwa separacja koncepcyjna.
- Determinizm silników (te same wejścia → ten sam wynik).

---

## 9. Rekomendacje priorytetowe (przed zamrożeniem fundamentów)

| # | Rekomendacja | Priorytet | Status |
|---|---|---|---|
| R1 | Wspólny wersjo-świadomy loader katalogu + derywacja stałych | Krytyczny | ✅ zrobione (rdzeń) |
| R2 | Zdefiniować most offline → runtime (kontrakty danych) | Krytyczny | → `FINAL_CORE_ARCHITECTURE.md` |
| R3 | Przewlec `methodology_version_id` przez wszystkie artefakty | Wysoki | zaplanowane |
| R4 | Orkiestrator buildu (DAG + checksum świeżości) | Wysoki | zaplanowane |
| R5 | Rozdzielić `docs/**` (raporty) od `generated/**` (kontrakty) | Średni | zaplanowane |
| R6 | Ujednolicić nazewnictwo „knowledge” | Średni | zaplanowane |
| R7 | Zastąpić ręczny split seeda procesem migracyjnym | Średni | zaplanowane |

R1 wykonane w tej sesji. R2 rozstrzygnięte projektowo w `FINAL_CORE_ARCHITECTURE.md`.
Reszta to dług planowy (nie blokuje startu React+Supabase, o ile fundament z R2 jest przyjęty).
