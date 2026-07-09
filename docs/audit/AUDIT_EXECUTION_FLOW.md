# Audit Execution Flow

> Przebieg wykonania audytu w Universal Audit Engine (runtime). Etap projektowy — bez kodu.
> Opisany jako deterministyczny pipeline + maszyna stanów. Pseudokod ma charakter poglądowy.

Powiązane: `UNIVERSAL_AUDIT_ENGINE.md`, `AUDIT_DATA_MODEL.md`, `AUDIT_PLUGIN_ARCHITECTURE.md`, `AUDIT_LIFECYCLE.md`.

---

## 1. Pipeline wysokopoziomowy

```
1. RESOLVE TEMPLATE     → wybór wersji szablonu + wersji metodologii (+ checksum)
2. CREATE SESSION       → instancja audytu dla obiektu + kontekst (typ budynku, strefa)
3. BUILD QUESTION PLAN  → rozwinięcie sekcji/pytań, i18n, kolejność
4. RENDER LOOP          → dla każdego pytania: widoczność → odpowiedź → dowody
     ├─ VISIBILITY       (dependency rules: show/hide/skip/branch)
     ├─ CAPTURE ANSWER   (typ odpowiedzi + normalizacja + jednostki)
     ├─ CAPTURE EVIDENCE (wymagane zdjęcia/dokumenty)
     └─ INLINE VALIDATE  (min/max/range/regex/evidence_count)
5. COMPLETENESS GATE    → wszystkie required odpowiedziane + dowody kompletne
6. RULES ENGINE         → walidacja globalna, blokery, krytyczne błędy, ostrzeżenia
7. MAP TO INPUTS        → odpowiedzi → wejścia metodologii (plugin.input_mapping)
8. CALCULATION          → CalculationStrategy → wynik (per-service/domain/total/class)
9. RECOMMENDATIONS      → Recommendation Engine (z gapów)
10. OPTIMIZATION         → Optimization Engine → etapy + roadmapa
11. REPORT               → render PDF / JSON / API / Dashboard
12. LIFECYCLE            → completed → validated → approved → archived
```

Każdy krok jest **idempotentny** i zapisuje `audit_event` (ścieżka audytowa).

---

## 2. Krok 1–2: rozwiązanie szablonu i utworzenie sesji

```
resolve_template(family_code, version?, at_date?):
    template = pick active version for family (or explicit version)
    methodology = MethodologyVersionEngine.materialize(template.methodology_version_id)
    strategy   = template.calculation_strategy or methodology.calculation_strategy
    return { template, methodology, strategy, template_checksum }

create_session(template, subject, auditor, language, context):
    validate context has required keys for methodology
        (SRI: building_type ∈ {...}, climate_zone ∈ {...})
    session.status = draft
    snapshot template_checksum + methodology_version_id
    emit event(status_change: draft)
```

Kontekst (typ budynku, strefa klimatyczna) jest wejściem do obliczeń — musi być ustalony
przed liczeniem, ale może być zebrany jako pierwsze pytania sekcji „kontekst”.

---

## 3. Krok 3–4: plan pytań i pętla renderowania

### 3.1 Widoczność / pomijanie (dependency rules)

Dla każdego pytania silnik ewaluuje reguły zależności na bieżącym stanie odpowiedzi:

```
evaluate_visibility(question, answers, context):
    visible = true; required = question.required
    for rule in question.dependency_rules:
        if eval(rule.condition, answers, context):
            apply rule.action:
                hide      -> visible=false
                skip      -> visible=false, mark answer.is_skipped=true, status=not_applicable
                show      -> visible=true
                require   -> required=true
                optional  -> required=false
                set_option-> restrict/expand allowed options
                branch    -> enqueue target sub-questions
                prefill   -> set default answer (source=ai_suggested/derived)
    return { visible, required }
```

Przykład SRI (triage): jeśli `H-system-present = no` → wszystkie pytania FL usług grzewczych
otrzymują `skip` (nie liczą się do maxposs). Zgodne z `triage_affects_max`.

### 3.2 Przechwycenie odpowiedzi wg typu

| answer_type | walidacja/normalizacja wejścia |
|---|---|
| yes_no | `{true,false}` |
| number | liczba, sprawdzenie min/max, jednostka |
| text | długość, opcjonalny regex |
| single_choice | wartość ∈ opcje |
| multi_choice | podzbiór opcji, min/max liczności |
| photo | ≥ `min_count` plików typu obraz |
| document | ≥ `min_count` PDF/dokument |
| gps | `{lat,lng,accuracy}`, walidacja dokładności |
| signature | obecność podpisu (canvas/plik) |
| measurement | liczba + jednostka + zakres + (opcjonalnie) evidence |
| device_reading | wartość + źródło urządzenia + timestamp (source=device) |

Normalizacja: wartości sprowadzane do postaci kanonicznej (`normalized_value`, SI),
aby wynik był niezależny od jednostki wprowadzania.

### 3.3 Dowody (Evidence)

```
capture_evidence(answer, requirement):
    for req in question.evidence_requirements:
        if eval(req.required_when, answers, context):
            need = req.min_count for req.evidence_type
            if count(answer.evidence where type=req.type) < need:
                mark answer.evidence_missing = true
```

Brak wymaganego dowodu **nie blokuje** zapisu odpowiedzi, ale ustawia flagę → wpływa na
bramkę kompletności i status sesji `waiting_for_evidence`.

### 3.4 Walidacja inline (per pytanie)

```
validate_answer(answer):
    for v in question.validations:
        if not passes(v, answer):
            record issue(severity=v.severity, message=v.message_key)
```

`blocker`/`critical` uniemożliwiają przejście dalej; `warning`/`info` są raportowane.

---

## 4. Krok 5–6: bramka kompletności + Rules Engine

```
completeness_gate(session):
    required = all visible & required questions
    answered = required with valid answer (not skipped)
    evidence_ok = no answer with evidence_missing (dla required)
    if answered < required: status=in_progress
    elif not evidence_ok:  status=waiting_for_evidence
    else:                  status=completed (kandydat)

rules_engine(session):
    issues = []
    for rule in template.audit_rules (scope global/section):
        if eval(rule.expression, answers, context):
            issues += emit(rule.rule_type, rule.severity, rule.output)
    blockers   = issues where severity=blocker
    criticals  = issues where severity=critical
    return { issues, has_blockers: len(blockers)>0 }
```

Jeśli są blokery → sesja nie może przejść do `validated`.

---

## 5. Krok 7–8: mapowanie i obliczenia

```
map_to_inputs(session, plugin):
    inputs = plugin.input_mapping(answers, context, methodology)
    # SRI: {service_code: functionality_level} + {building_type, climate_zone}
    return inputs

calculate(inputs, strategy):
    engine = CalculationRegistry.resolve(strategy.algorithm_type)
    result = engine.run(inputs, methodology)     # deleguje do istniejącego sri_engine
    persist audit_calculation_result(inputs_snapshot=inputs, result=result)
    return result
```

Silnik audytu **nie liczy sam** — deleguje do strategii metodologii (dla SRI: istniejący
`sri_engine` z renormalizacją wag). Wynik zawsze wraca w kanonicznej strukturze:
`{ per_service, per_domain, per_criterion, total_score, class, warnings }`.

---

## 6. Krok 9–11: rekomendacje, optymalizacja, raport

```
recommend(result, dependency_graph):
    gaps = detect_gaps(result)              # FL poniżej osiągalnego / brakujące usługi
    recs = RecommendationEngine.evaluate(gaps, context)
    persist audit_recommendation[]

optimize(recs, capabilities):
    roadmap = OptimizationEngine.roadmap(recs, capabilities, context)  # etapy 1–5
    persist audit_roadmap(stages=roadmap)

report(session):
    payload = assemble_canonical(result, recs, roadmap, evidence_index, provenance)
    for fmt in requested_formats:
        render(fmt, payload)   # pdf | json | api | dashboard
    persist audit_report[]
```

Jeden **kanoniczny payload** zasila wszystkie formaty (spójność PDF/JSON/API/Dashboard).

---

## 7. Rola AI Assistant (opcjonalna, na każdym etapie)

| Miejsce | Wsparcie AI |
|---|---|
| RENDER LOOP | podpowiedź odpowiedzi, wykrycie sprzeczności, `prefill` (source=ai_suggested) |
| EVIDENCE | analiza zdjęć/PDF (opis, ekstrakcja tekstu) — istniejący `knowledge-image-analyzer` |
| RULES | wykrycie brakujących dowodów, sugestia `needs_verification` |
| REPORT | draft narracji raportu z kanonicznego payloadu |

AI **nie zmienia** wyniku obliczeń — działa doradczo; jego wkład jest oznaczony
(`source=ai_suggested`, `confidence`) i podlega weryfikacji audytora.

---

## 8. Maszyna stanów (skrót)

```
draft → started → in_progress → (waiting_for_evidence ⇄ in_progress)
      → completed → validated → approved → archived
```

Przejścia i bramki: `AUDIT_LIFECYCLE.md`. Każde przejście = `audit_event`.

---

## 9. Determinizm i odtwarzalność

- Wejścia obliczeń zapisane w `inputs_snapshot`.
- `template_checksum` + `methodology_version_id` przypięte do sesji.
- `engine_version` zapisany w wyniku.
- Ponowne uruchomienie kroków 7–11 na tych samych danych daje identyczny wynik.
