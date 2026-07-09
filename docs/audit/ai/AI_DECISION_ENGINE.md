# AI Decision Engine

> Jak AI Audit Assistant podejmuje decyzje. Etap projektowy — bez kodu, bez modeli AI.
> Silnik decyzyjny = deterministyczne reguły (grounding) + warstwa generatywna (LLM) pod kontrolą.

Powiązane: `AI_AUDIT_ASSISTANT.md`, `AI_CONTEXT_MODEL.md`, `AI_QUESTION_SELECTION.md`, `AI_CONFIDENCE_MODEL.md`.

---

## 1. Zasada: hybryda deterministyczna + generatywna

Decyzje dzielą się na dwie warstwy, aby zachować audytowalność i powtarzalność:

| Warstwa | Odpowiada za | Charakter |
|---|---|---|
| **Deterministic core** | skip/require/prefill z zależności i Device Profiles, wykrycie twardych niespójności, wymagane dowody | reguły, powtarzalne, testowalne |
| **Generative layer (LLM)** | język naturalny, interpretacja opisów/zdjęć/dokumentów, propozycje pytań doprecyzowujących, draft narracji | elastyczny, zawsze ugruntowany + potwierdzany |

Reguła nadrzędna: **jeśli decyzję da się wyprowadzić deterministycznie z Dependency Engine /
Device Profile — robi to core, nie LLM.** LLM uzupełnia tam, gdzie potrzeba rozumienia treści.

---

## 2. Wejścia i wyjścia

```
DECISION(input) -> actions[]

input:
  context            (AI_CONTEXT_MODEL: conversation, building, devices,
                      evidence, audit_state, pending_questions, confidence, kb_ref)
  last_event         (odpowiedź / zdjęcie / dokument / komenda audytora)
  methodology        (wersja + wagi + impact scores)
  dependency_graph   (capabilities, FL prerequisites, blocking conditions)

actions[] (każda z: type, target, payload, rationale, source, confidence, requires_confirmation)
```

`source` ∈ {`deterministic`, `llm`, `vision`, `document`, `bms`}.
`rationale` zawsze wskazuje podstawę (capability / usługa / dokument z bazy wiedzy).

---

## 3. Typy akcji

| type | Znaczenie | Przykład |
|---|---|---|
| `skip_question` | pomiń pytanie (wynika z kontekstu) | „harmonogram” gdy jest Loxone |
| `add_question` | dodaj pytanie doprecyzowujące | „które domeny obsługuje Loxone?” |
| `reorder_questions` | zmień priorytet | najpierw pytania odblokowujące najwięcej |
| `prefill_answer` | zaproponuj odpowiedź | FL=3 dla sterowania z komunikacją |
| `request_photo` | poproś o zdjęcie | szafa sterownicza / czujnik CO₂ |
| `request_measurement` | poproś o pomiar | temperatura wywiewu / stężenie CO₂ |
| `flag_inconsistency` | oznacz sprzeczność | „brak licznika” + „monitoring energii = tak” |
| `flag_missing_info` | wskaż lukę | brak potwierdzenia integracji BMS |
| `mark_needs_verification` | obniż pewność, żądaj dowodu | wartość spoza typowego zakresu |
| `suggest_recommendation` | zaproponuj rekomendację | z Recommendation Engine dla braku |
| `summarize_evidence` | streść dokument/zdjęcie/BMS | fakty z DTR |
| `explain` | wyjaśnij pytanie/wynik audytorowi | po co pytamy o CO₂ |

Każda akcja z wpływem na wynik ma `requires_confirmation = true`.

---

## 4. Reguły decyzyjne (deterministic core)

### 4.1 Wnioskowanie z urządzeń (Device Profile → capabilities)
```
on device_declared(profile):
    caps = DeviceProfile[profile].provides_capabilities
    for q in pending_questions:
        if q.capability in caps and q maps to "does capability exist":
            emit skip_question(q) + prefill_answer(q, yes, source=deterministic)
    for cap in DeviceProfile[profile].clarify_capabilities:
        emit add_question(clarify(cap))
```

### 4.2 Blokery i braki (Blocking Conditions)
```
for service in in_scope_services:
    target_fl = declared_or_expected_fl(service)
    for req in dependency_graph[service].fl_prerequisites[target_fl]:
        if req.capability not satisfied:
            emit flag_missing_info(req) 
            if req blocks FL: emit request_photo/measurement(evidence_for(req))
```

### 4.3 Twarde niespójności (cross-field)
```
if answer("energy_monitoring") == yes and not capability("energy_metering"):
    emit flag_inconsistency("monitoring energii bez licznika")
if FL(service) > 0 and system_present(service.domain) == no:
    emit flag_inconsistency("poziom > 0 przy braku systemu")
```

### 4.4 Wymagane dowody
```
if question.evidence_requirements active and evidence missing:
    emit request_photo/document(question)
```

Te reguły są **powtarzalne** i nie zależą od LLM — stanowią rdzeń audytowalności.

---

## 5. Warstwa generatywna (LLM) — pod kontrolą

LLM uruchamiany dla zadań wymagających rozumienia treści:

| Zadanie | Wejście | Wyjście | Guardrail |
|---|---|---|---|
| interpretacja opisu | tekst audytora | mapowanie na capability/usługę + confidence | musi trafić w istniejący słownik capability |
| analiza zdjęcia | obraz | wykryte urządzenia/funkcje | wynik jako `prefill` do potwierdzenia |
| analiza dokumentu | PDF/DTR | fakty (marka, model, funkcje) | cytowanie fragmentu |
| analiza eksportu BMS | log/CSV | potwierdzone funkcje sterowania | mapowanie na capability |
| pytania doprecyzowujące | luki z core | lista pytań w NL | tylko dla capability oznaczonych `clarify` |
| draft raportu | kanoniczny wynik | narracja | brak liczb spoza wyniku silnika |

Wszystkie wyjścia LLM: `source=llm/vision/document/bms`, `requires_confirmation=true`,
z `confidence` (patrz `AI_CONFIDENCE_MODEL.md`).

---

## 6. Priorytetyzacja akcji

Gdy powstaje wiele akcji, sortowane wg wpływu na audyt:

```
priority = w1 * blocks_result
         + w2 * unlocks_services      (ile usług/FL odblokuje ustalenie)
         + w3 * closes_inconsistency
         + w4 * information_gain      (redukcja niepewności)
         - w5 * effort               (koszt dla audytora)
```

`unlocks_services` i `blocks_result` pochodzą z Dependency Engine — spójne z logiką
Optimization Engine (premiowanie cross-domain capability).

---

## 7. Pełny przykład decyzji: „Mam Loxone”

```
last_event = answer_free_text("Mam Loxone")

deterministic:
  profile = match_device("Loxone") -> BACS controller
  caps = {scheduling, zone_control, central_automatic_control,
          digital_integration, remote_access}
  actions += skip_question("harmonogram?")        (prefill yes)
  actions += skip_question("sterowanie strefowe?")(prefill yes)
  actions += skip_question("zdalny dostęp?")      (prefill yes)
  actions += flag_missing_info("czujnik CO2?")    (blokuje wysokie FL wentylacji)
  actions += request_photo("szafa sterownicza / kontroler")

generative:
  actions += add_question("Które domeny są wpięte w Loxone?")
  actions += add_question("Czy Loxone zbiera dane z liczników energii?")
  actions += add_question("Harmonogramy czy również optymalizacja/predykcja?")

priority sort -> [flag_missing_info(CO2), add_question(domeny),
                  add_question(liczniki), skip(...)... ]

all actions -> auditor confirmation (co-pilot)
```

---

## 8. Bezpieczeństwo decyzji

- **Whitelist akcji** — AI może emitować tylko zdefiniowane typy akcji.
- **Brak samodzielnej mutacji wyniku** — akcje wpływające na scoring wymagają potwierdzenia
  i przechodzą przez deterministyczny silnik.
- **Ślad decyzji** — każda akcja zapisywana jako `audit_event` (co, dlaczego, źródło, pewność).
- **Grounding obowiązkowy** — akcja bez podstawy (capability/usługa/dokument) jest odrzucana.
- **Odwracalność** — prefille i sugestie da się cofnąć; oryginalne odpowiedzi audytora nietykalne.
