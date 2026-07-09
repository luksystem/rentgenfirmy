# Universal Audit Engine (UAE)

> Dokument projektowy fundamentu audytowego platformy Rentgen. Etap: **projekt architektury**.
> Bez UI, bez React, bez formularzy, bez kodu. SRI jest pierwszą metodologią; architektura jest uniwersalna.

Dokumenty powiązane:
- `AUDIT_DATA_MODEL.md` — model danych (encje, pola, enumy, i18n, wersjonowanie)
- `AUDIT_EXECUTION_FLOW.md` — przebieg wykonania audytu (runtime)
- `AUDIT_PLUGIN_ARCHITECTURE.md` — jak metodologie podłączają się do silnika
- `AUDIT_LIFECYCLE.md` — statusy, przejścia, bramki, ścieżka audytowa
- `docs/sri/methodology/METHODOLOGY_VERSION_ENGINE.md` — silnik wersji metodologii (już zbudowany)
- `docs/sri/recommendation/*` oraz `docs/sri/optimization/*` — silniki rekomendacji i optymalizacji (już zbudowane)

---

## 1. Cel

**Oddzielić metodologię od wykonania audytu.**

Silnik wykonuje **dowolny audyt** na podstawie konfiguracji metodologii. Metodologia mówi
*co* i *jak liczyć/oceniać*; silnik audytu mówi *jak zebrać dane, dowody i przeprowadzić proces*.

Docelowo jeden silnik obsługuje:

| Metodologia | Charakter | Model oceny |
|---|---|---|
| SRI | ilościowy | wagi domen + impact scores (Method B) |
| EPBD | mieszany | zgodność + wskaźniki energetyczne |
| EN ISO 52120 (BACS) | ilościowy | klasy funkcjonalne A–D |
| ESG | wskaźnikowy | metryki + ujawnienia |
| WELL | punktowy (credits) | punkty w kategoriach zdrowia |
| LEED | punktowy (credits) | prerekwizyty + punkty |
| BREEAM | punktowy (credits) | kategorie + wagi |
| Smart Home Audit | checklista + pomiary | scoring własny |
| Internal Acceptance Audit | checklista | pass/fail + blokery |
| Service Audit | checklista + pomiary | pass/fail + zalecenia |
| własne metodologie Luksystem | dowolny | plugin |

**Zasada nadrzędna:** dodanie nowej metodologii = konfiguracja (dane) + opcjonalny plugin obliczeniowy,
**bez zmian w rdzeniu silnika**.

---

## 2. Zasady architektoniczne

1. **Metodologia jako dane, nie jako kod.** Struktura audytu (sekcje, pytania, walidacje, reguły)
   jest konfiguracją. Kod dostarcza tylko generyczny runtime + wąskie hooki pluginów.
2. **Separacja warstw:** definicja (Template) ≠ wykonanie (Session) ≠ ocena (Methodology/Rules) ≠ prezentacja (Report).
3. **Wersjonowanie wszystkiego.** Template i Session są przypięte do konkretnej wersji metodologii
   (`MethodologyVersion`). Zmiana metodologii nie mutuje trwających sesji.
4. **Wielojęzyczność wbudowana.** Każdy tekst ma warstwę i18n; wynik i dowody są językowo-neutralne.
5. **Dowody (Evidence) pierwszej klasy.** Odpowiedź może wymagać zdjęć/dokumentów; brak dowodu = bramka.
6. **Deterministyczność i audytowalność.** Każdy wynik da się odtworzyć: snapshot wejść, checksum
   szablonu, wersja silnika, ścieżka audytowa (kto/kiedy/co).
7. **Idempotentna integracja z istniejącymi silnikami** (Version / Recommendation / Optimization / AI).
8. **Provenance.** Każda reguła/zależność ma `source_type`: `official_methodology` lub `engineering_assumption`.

---

## 3. Architektura warstwowa

```
                    ┌──────────────────────────────────────────────┐
                    │              METHODOLOGY LAYER                │
                    │  MethodologyVersion · CalculationStrategy     │
                    │  (wagi, impact scores, scoring, klasy)        │
                    │  -> Methodology Version Engine (gotowe)       │
                    └──────────────────────┬───────────────────────┘
                                           │ binduje
                    ┌──────────────────────▼───────────────────────┐
                    │              DEFINITION LAYER                 │
                    │  AuditTemplate -> Sections -> Questions       │
                    │  AnswerTypes · Validations · DependencyRules  │
                    │  EvidenceRequirements · i18n · versioning     │
                    └──────────────────────┬───────────────────────┘
                                           │ instancjonuje
                    ┌──────────────────────▼───────────────────────┐
                    │              EXECUTION LAYER                  │
                    │  AuditSession -> Answers -> Evidence          │
                    │  visibility/skip · validation · progress      │
                    └──────────────────────┬───────────────────────┘
                                           │ zasila
                    ┌──────────────────────▼───────────────────────┐
                    │              EVALUATION LAYER                 │
                    │  Rules Engine · Calculation (strategy)        │
                    │  Recommendation Engine · Optimization/Roadmap │
                    └──────────────────────┬───────────────────────┘
                                           │ publikuje
                    ┌──────────────────────▼───────────────────────┐
                    │              PRESENTATION LAYER              │
                    │  Report: PDF · JSON · API · Dashboard         │
                    └──────────────────────────────────────────────┘
```

Łańcuch przetwarzania (zgodny z zadaniem):

```
Audit Template → Audit Session → Sections → Questions → Answers → Evidence
→ Rules → Calculations → Recommendations → Optimization → Roadmap → Report
```

---

## 4. Rola każdej warstwy

- **Methodology Layer** — źródło prawdy o punktacji. Dla SRI to katalog + `MethodologyVersion`
  + `CalculationStrategy`. UAE nie duplikuje wag/impact scores — pobiera je z tej warstwy.
- **Definition Layer (Template)** — kwestionariusz: co zapytać, jak zwalidować, jakich dowodów żądać,
  jak ukrywać/pomijać pytania. Mapuje odpowiedzi na wejścia metodologii (np. odpowiedzi → wybór FL usługi SRI).
- **Execution Layer (Session)** — konkretne wykonanie na konkretnym obiekcie: odpowiedzi, dowody,
  postęp, status, kontekst (typ budynku, strefa klimatyczna — wejście do obliczeń).
- **Evaluation Layer** — Rules Engine (walidacja/blokery/ostrzeżenia) + wywołanie strategii liczenia
  + Recommendation Engine + Optimization Engine (roadmapa).
- **Presentation Layer** — generacja raportów w wielu formatach z jednego kanonicznego wyniku.

---

## 5. Integracje (ponowne użycie istniejących silników)

| Silnik | Status | Rola w UAE |
|---|---|---|
| Methodology Version Engine | gotowy | dostarcza wersję metodologii, strategię liczenia, checksumy, diff |
| Recommendation Engine | gotowy | z gapów (braków) generuje rekomendacje, priorytet, expected gain |
| Optimization Engine | gotowy | układa etapy modernizacji i roadmapę z rekomendacji |
| AI Assistant | istnieje (Baza wiedzy / OpenAI) | podpowiedzi audytora, analiza zdjęć/dokumentów, wykrywanie niespójności, draft raportu |

UAE nie reimplementuje tych silników — wywołuje je przez zdefiniowane kontrakty (patrz
`AUDIT_PLUGIN_ARCHITECTURE.md`).

---

## 6. Jak SRI mapuje się na UAE (przykład referencyjny)

```
AuditTemplate: code=SRI, methodology_version=eu-sri-v4.5
  Sections   = 9 domen technicznych SRI (heating, cooling, ...)
  Questions  = 54 usługi SRI (jedno pytanie "single_choice" = wybór Functionality Level 0..N)
               + pytania kontekstowe (typ budynku, strefa klimatyczna, triage/obecność systemu)
  AnswerType = single_choice (poziom FL), yes_no (obecność systemu), measurement (opcjonalnie)
  Evidence   = zdjęcie instalacji / zrzut z BMS / dokumentacja (wg dependency engine)
  Validation = zakres poziomu 0..fl_max, wymagane dowody dla wysokich FL
  DependencyRules = brak systemu -> pomiń pytania o FL tej usługi (triage_affects_max)
  Mapping    = odpowiedzi -> {service_code: FL} -> wejście CalculationStrategy
  Rules      = scoring z impact scores + wag (renormalizacja domen)
  Recommend. = Recommendation Engine (braki FL -> rekomendacje)
  Optimize   = Optimization Engine (etapy 1–5, roadmapa)
  Report     = SRI class + wynik + rekomendacje + roadmapa
```

Ten sam szkielet obsłuży EPBD/ESG/WELL/LEED/BREEAM — różnią się tylko konfiguracją Template,
strategią liczenia i mapowaniem odpowiedzi.

---

## 7. Czego UAE świadomie NIE robi (granice)

- Nie zawiera logiki konkretnej metodologii w rdzeniu (jest w warstwie danych + plugin).
- Nie renderuje UI/formularzy (osobna warstwa prezentacji, poza tym etapem).
- Nie przechowuje wag/impact scores — deleguje do Methodology Version Engine.
- Nie tworzy własnego mechanizmu wersjonowania metodologii — używa istniejącego.

---

## 8. Artefakty tego etapu

Pięć dokumentów projektowych (ten + cztery powiązane). Brak kodu, brak migracji DB — model danych
w `AUDIT_DATA_MODEL.md` jest propozycją schematu do wdrożenia w kolejnym etapie.
