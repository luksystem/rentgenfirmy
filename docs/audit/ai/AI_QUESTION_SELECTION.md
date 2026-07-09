# AI Question Selection

> Jak AI wybiera następne pytanie, pomija zbędne i dodaje doprecyzowujące. Etap projektowy — bez kodu.
> Cel: minimalna liczba pytań przy maksymalnej wartości informacyjnej dla wyniku audytu.

Powiązane: `AI_AUDIT_ASSISTANT.md`, `AI_DECISION_ENGINE.md`, `AI_CONTEXT_MODEL.md`, `AI_CONFIDENCE_MODEL.md`.

---

## 1. Trzy operacje

```
QUESTION SELECTION
├─ SKIP    usuń pytania, których odpowiedź już wynika z kontekstu
├─ ADD     dodaj pytania doprecyzowujące (dynamiczne, poza szablonem bazowym)
└─ RANK    uszereguj pozostałe wg wartości informacyjnej
```

Wszystkie trzy działają na `Pending Questions` z `AI_CONTEXT_MODEL` i są ugruntowane w
Dependency Engine (capabilities, FL prerequisites, blocking conditions).

---

## 2. SKIP — pomijanie zbędnych pytań

Pytanie jest kandydatem do pominięcia, gdy:

| Warunek | Źródło | Akcja |
|---|---|---|
| capability wynika z Device Profile | Installed Devices | `skip` + `prefill` (do potwierdzenia) |
| odpowiedź wynika z reguły zależności | dependency_rule (skip/hide) | `skip` (not_applicable) |
| system nieobecny (triage) | odpowiedź „brak systemu” | `skip` wszystkich FL tej usługi |
| pytanie wzajemnie wykluczające | `mutual_exclusion_group` | `skip` alternatywy |
| odpowiedź już wywnioskowana z dowodu | Evidence extracted_facts | `skip` + `prefill` |

Zasada bezpieczeństwa: SKIP z `prefill` **nie jest** ostateczny — audytor widzi i może cofnąć.
SKIP typu `not_applicable` (brak systemu) jest twardy i zgodny z metodologią (nie liczy się do maxposs).

```
should_skip(question, context):
    if question.capability in context.derived_capabilities: return prefill_skip
    if matches dependency_rule(action in {skip,hide}): return skip
    if triage_says_absent(question.domain): return skip_not_applicable
    if fact_in_evidence(question): return prefill_skip
    return keep
```

---

## 3. ADD — dodawanie pytań dynamicznych

AI dodaje pytania spoza szablonu bazowego, gdy trzeba rozstrzygnąć wynik:

| Wyzwalacz | Dodane pytanie |
|---|---|
| capability oznaczona `clarify` w Device Profile | „Czy Loxone zbiera dane z liczników energii?” |
| brak blokujący wyższy FL | „Czy jest czujnik CO₂ w wentylacji?” |
| niejednoznaczny opis audytora | pytanie zawężające do słownika capability |
| dowód sugeruje funkcję, brak potwierdzenia | „Na zdjęciu widać licznik — czy jest odczyt zdalny?” |
| cross-domain capability możliwa | „Czy obecność steruje też oświetleniem i HVAC?” |

Dodane pytania są oznaczone `dynamic=true`, mają `capability` i `unlocks` (co rozstrzygną),
i zawsze mieszczą się w słowniku capability (brak pytań „z powietrza”).

```
propose_additions(context, dependency_graph):
    add = []
    for cap in clarify_capabilities(context.devices): add += question_for(cap)
    for block in active_blocking_conditions(context): add += question_for(block.capability)
    for amb in ambiguous_answers(context): add += narrowing_question(amb)
    return dedupe(add)
```

---

## 4. RANK — priorytetyzacja pytań

Pozostałe pytania szeregowane malejąco wg wartości:

```
score(question) =
      w1 * blocks_result          (czy brak odpowiedzi blokuje policzenie wyniku)
    + w2 * unlocks_services       (ile usług/FL rozstrzyga, z Dependency Engine)
    + w3 * affected_domains       (ile domen dotyczy — premia cross-domain)
    + w4 * information_gain        (redukcja niepewności, z Confidence Model)
    + w5 * required               (pytanie obowiązkowe)
    - w6 * effort                 (koszt: pomiar/wejście na dach itp.)
    - w7 * evidence_burden        (czy wymaga trudnego dowodu)
```

- `unlocks_services`, `affected_domains` — spójne z premiowaniem cross-domain w
  Recommendation/Optimization Engine.
- `information_gain` — pytania o niskiej pewności lub szeroko rozstrzygające na górze.
- `effort` — pytania „przy okazji” grupowane (np. wszystkie pomiary w jednym pomieszczeniu).

### Grupowanie (batching)
Po rankingu AI grupuje pytania, by ograniczyć przemieszczanie się audytora:
```
group_by: [ same_room/section, same_evidence_type, same_device ]
```
Np. „skoro jesteś przy szafie sterowniczej — zrób zdjęcie i potwierdź 3 funkcje naraz”.

---

## 5. Kolejność sekcji vs pytań

- Kolejność sekcji z szablonu jest domyślna, ale AI może **przesunąć** pytania
  odblokowujące najwięcej na początek (bez łamania zależności).
- Pytania kontekstowe (typ budynku, strefa) mają zawsze najwyższy priorytet — są wejściem
  do obliczeń i do doboru wag.
- Pytania zależne czekają, aż ich warunek nadrzędny zostanie rozstrzygnięty (branch).

---

## 6. Pętla doboru (na każdą zmianę stanu)

```
on context_change:
    pending = template_questions ∪ dynamic_questions
    pending = remove( skip_candidates(pending) )
    pending += propose_additions()
    for q in pending: q.score = rank(q)
    pending.sort(desc by score)
    pending = group_by_locality(pending)
    next = pending.top()
    emit next_questions(top_k) + skipped(reasons)
```

Wynik trafia do `Pending Questions` w kontekście i do akcji Decision Engine
(`add_question` / `skip_question` / `reorder_questions`).

---

## 7. Przykład (kontynuacja „Mam Loxone”)

```
Stan: devices=[Loxone], caps={scheduling,zone_control,integration,remote_access}

SKIP (prefill yes): "harmonogram?", "sterowanie strefowe?", "zdalny dostęp?"
ADD:  "które domeny w Loxone?", "liczniki energii w Loxone?",
      "harmonogramy czy predykcja?"
RANK (malejąco):
  1. czujnik CO2 w wentylacji?      (blocks high FL, unlocks 2 usługi)   ← góra
  2. liczniki energii w Loxone?     (unlocks monitoring energii, cross-domain)
  3. które domeny w Loxone?         (rozstrzyga zakres)
  4. harmonogramy vs predykcja?     (różnica FL)
  ... (potwierdzenia skipów niżej)
GROUP: pytania „przy kontrolerze” + prośba o 1 zdjęcie szafy
```

Efekt: audytor dostaje krótką, uszeregowaną listę zamiast pełnego kwestionariusza.

---

## 8. Gwarancje

- **Nie pomija pytań wymaganych przez metodologię**, jeśli brak jednoznacznej podstawy.
- **Nie dodaje pytań poza słownikiem capability** (grounding).
- **Nie łamie zależności** (branch/prerequisites respektowane).
- Każdy SKIP/ADD/REORDER ma `reason` i trafia do `audit_event` (audytowalność).
