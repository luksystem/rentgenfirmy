# Audit Plugin Architecture

> Jak metodologie podłączają się do Universal Audit Engine. Etap projektowy — bez kodu.
> Cel: dodać nową metodologię **bez zmian w rdzeniu silnika**.

Powiązane: `UNIVERSAL_AUDIT_ENGINE.md`, `AUDIT_DATA_MODEL.md`, `AUDIT_EXECUTION_FLOW.md`, `AUDIT_LIFECYCLE.md`.

---

## 1. Zasada: data-first, code-second

Metodologię definiuje się w dwóch warstwach:

1. **Konfiguracja (dane)** — `audit_template` + sekcje + pytania + walidacje + reguły + i18n.
   To pokrywa **większość** metodologii (checklisty, credity, zgodność).
2. **Plugin (kod)** — tylko gdy potrzeba nietrywialnego mapowania odpowiedzi na wejścia
   lub własnego algorytmu liczenia (`algorithm_type`).

Rdzeń UAE (render loop, walidacja, lifecycle, evidence, report) jest **wspólny i niezmienny**.

---

## 2. Kontrakt pluginu metodologii (`MethodologyPlugin`)

Interfejs (kontrakt logiczny — nie implementacja):

```
MethodologyPlugin:
    metadata():
        { code, methodology_type, supported_versions[], capabilities[] }

    # 1) Definicja / walidacja szablonu (opcjonalnie generuje z katalogu)
    provide_template(version) -> AuditTemplate | None      # None = w pełni data-driven
    validate_template(template) -> issues[]

    # 2) Kontekst wymagany do obliczeń
    required_context() -> [ "building_type", "climate_zone", ... ]

    # 3) Mapowanie odpowiedzi -> wejścia strategii liczenia
    input_mapping(answers, context, methodology) -> inputs

    # 4) Wiązanie strategii liczenia
    calculation_strategy(methodology) -> strategy_id

    # 5) Hooki opcjonalne (mają domyślne implementacje w rdzeniu)
    scoring_hooks() -> []          # dodatkowe reguły scoringu
    validation_hooks() -> []       # walidacje specyficzne dla metodologii
    detect_gaps(result) -> gaps[]  # jak wyznaczyć braki do rekomendacji
    recommendation_provider() -> RecommendationEngine adapter
    optimization_provider()   -> OptimizationEngine adapter
    report_sections(payload)  -> [] # dodatkowe sekcje raportu
```

Plugin dostarcza **tylko to, czego potrzebuje**. Brak metody = użyj domyślnej z rdzenia.

---

## 3. Rejestry (rozszerzalność bez zmian rdzenia)

```
MethodologyPluginRegistry   : methodology_type -> MethodologyPlugin
CalculationRegistry         : algorithm_type   -> CalculationEngine
AnswerTypeRegistry          : answer_type      -> {validate, normalize}
EvidenceTypeRegistry        : evidence_type    -> {accept, verify}
ExpressionOperatorRegistry  : operator         -> evaluator (whitelist)
ReportRendererRegistry      : format           -> renderer (pdf/json/api/dashboard)
```

Dodanie nowej metodologii/typu = wpis w odpowiednim rejestrze. Rdzeń iteruje po rejestrach,
nie zna konkretnych metodologii.

---

## 4. Podział odpowiedzialności

| Warstwa | Kto dostarcza | Przykład (SRI) |
|---|---|---|
| Struktura kwestionariusza | dane (`audit_template`) | 9 sekcji, 54 pytania FL |
| Typy odpowiedzi / walidacja pól | rdzeń (rejestry) | single_choice 0..4, range |
| Kontekst | plugin.required_context | building_type, climate_zone |
| Mapowanie odpowiedzi → wejścia | plugin.input_mapping | `{H-1a: 2, ...}` |
| Model punktacji (wagi, impact scores) | Methodology Version Engine | katalog SRI v4.5 |
| Algorytm liczenia | CalculationRegistry | `weighted_domain_renormalized_aggregation` |
| Wykrywanie braków | plugin.detect_gaps | FL < osiągalny |
| Rekomendacje / roadmapa | istniejące silniki | Recommendation/Optimization |
| Raport | rdzeń + plugin.report_sections | klasa SRI + roadmapa |

---

## 5. Mapowanie metodologii na architekturę

Różne rodziny metodologii = różne kombinacje tych samych klocków:

| Metodologia | Typ oceny | answer_types dominujące | Strategia liczenia | Plugin potrzebny? |
|---|---|---|---|---|
| SRI | ilościowy (wagi+impact) | single_choice (FL), yes_no | `weighted_domain_renormalized_aggregation` | tak (mapowanie FL) |
| EN ISO 52120 (BACS) | klasy A–D | single_choice | wariant wag bez renormalizacji | tak (klasa→wynik) |
| EPBD | mieszany (zgodność+wskaźniki) | yes_no, number, measurement | `compliance + indicators` | tak |
| ESG | wskaźnikowy | number, text, document | `metric_aggregation` | częściowo |
| WELL | credits (zdrowie) | yes_no, measurement, document | `credit_sum_by_category` | dane + prosty plugin |
| LEED | prerekwizyty + punkty | yes_no, document, number | `prerequisite_gate + credit_sum` | dane + plugin bramek |
| BREEAM | kategorie ważone | yes_no, number, document | `weighted_credit_sum` | dane + plugin |
| Smart Home Audit | checklista + pomiary | yes_no, measurement, photo | scoring własny | dane (opcjonalnie plugin) |
| Internal Acceptance | pass/fail + blokery | yes_no, photo, signature | `pass_fail_with_blockers` | tylko dane |
| Service Audit | checklista + pomiary | yes_no, measurement, photo, gps | `pass_fail + findings` | tylko dane |
| Luksystem custom | dowolny | dowolne | własny `algorithm_type` | tak |

Wniosek: **checklisty i pass/fail są w pełni data-driven**; metodologie ilościowe/kredytowe
wymagają lekkiego pluginu (mapowanie + strategia). Rdzeń pozostaje bez zmian.

---

## 6. Przykład: rejestracja pluginu SRI (poglądowo)

```
SriPlugin implements MethodologyPlugin:
    metadata: { code: "SRI", methodology_type: "SRI",
                supported_versions: ["eu-sri-v4.5", "pl-sri-v1.0", ...] }

    required_context: ["building_type", "climate_zone"]

    input_mapping(answers, context, methodology):
        inputs = {}
        for q in answers where q maps_to.target == "functionality_level":
            if not q.is_skipped:
                inputs[q.maps_to.service] = int(q.normalized_value)
        return { services: inputs, context: context }

    calculation_strategy(methodology):
        return methodology.calculation_strategy   # np. iso52120_weighted_renormalized

    detect_gaps(result):
        return [ s for s in result.per_service if s.fl < s.fl_reachable ]

    recommendation_provider(): -> adapter to SRI_RECOMMENDATION_GRAPH
    optimization_provider():   -> adapter to Optimization Engine

MethodologyPluginRegistry.register(SriPlugin)
CalculationRegistry.register("weighted_domain_renormalized_aggregation", sri_engine.run)
```

Nowa metodologia (np. WELL): rejestrujemy `WellPlugin` + strategię `credit_sum_by_category`.
Zero zmian w render loop, lifecycle, evidence, report.

---

## 7. Wersjonowanie pluginów i strategii

- Plugin deklaruje `supported_versions` (wersje metodologii, które obsługuje).
- Strategia liczenia jest identyfikowana po `id` i wybierana przez Methodology Version Engine.
- Zmiana algorytmu = nowa strategia (nowy `algorithm_type`) + wpis w `CalculationRegistry`;
  stare sesje liczą się starą strategią (przypięcie w sesji).
- Zgodność wsteczna: `MethodologyDiff` sygnalizuje, czy zmiana wymaga migracji szablonu/pluginu.

---

## 8. Granice pluginu (czego plugin NIE robi)

- Nie zarządza statusami/lifecycle (to rdzeń).
- Nie renderuje UI.
- Nie przechowuje wag/impact scores (to Methodology Version Engine).
- Nie omija bramek walidacji/evidence rdzenia.
