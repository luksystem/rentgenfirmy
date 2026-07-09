# AI Context Model

> Kontekst, na którym operuje AI Audit Assistant. Etap projektowy — bez kodu.
> Kontekst jest jawny, wersjonowany i budżetowany (token budget), aby decyzje były
> powtarzalne i audytowalne.

Powiązane: `AI_AUDIT_ASSISTANT.md`, `AI_DECISION_ENGINE.md`, `AI_QUESTION_SELECTION.md`, `AI_CONFIDENCE_MODEL.md`.

---

## 1. Osiem warstw kontekstu

```
AuditAIContext
├─ 1. Conversation Context      historia interakcji audytor ⇄ AI
├─ 2. Building Context          typ, strefa klimatyczna, wielkość, przeznaczenie
├─ 3. Installed Devices         urządzenia/systemy + wywnioskowane capabilities
├─ 4. Collected Evidence        zdjęcia, PDF, BMS, pomiary (z metadanymi)
├─ 5. Current Audit State       odpowiedzi, statusy, postęp, wynik cząstkowy
├─ 6. Pending Questions         pytania otwarte + priorytet + zależności
├─ 7. Confidence Level          pewność per odpowiedź/sekcja/audyt
└─ 8. Knowledge Base Reference  cytowane fragmenty wiedzy firmowej + katalog SRI
```

Kontekst to **pojedyncze, spójne źródło prawdy** dla Decision Engine. Każda warstwa ma
jasnego właściciela aktualizacji (kto/co ją zmienia).

---

## 2. Schemat warstw

### 2.1 Conversation Context
```
{ turns: [ {role: auditor|ai, type: text|action|confirm, content, ts} ],
  summary: "skrótowe streszczenie starszych tur (rolling summary)",
  open_threads: [ "oczekuje potwierdzenia CO2", ... ] }
```
Zarządzanie długością: starsze tury kompresowane do `summary` (rolling), pełne zostają
ostatnie N tur + wątki otwarte.

### 2.2 Building Context
```
{ building_type: non_residential|residential,
  climate_zone: north_east_europe|...,
  usage: office|retail|hospital|...,
  area_m2, floors, construction_year,
  source: manual|document|inferred }
```
Wejście do obliczeń SRI (typ + strefa). Ustalane wcześnie (sekcja „kontekst” audytu).

### 2.3 Installed Devices
```
{ devices: [ { profile: "Loxone"|"BACnet"|"KNX"|"Modbus"|...,
               name, domains: [heating,lighting,...],
               provides_capabilities: [...],
               confidence, source: declared|photo|document|bms } ],
  derived_capabilities: { capability -> {value, source, confidence} } }
```
Najważniejsza warstwa dla pomijania pytań — mapuje urządzenia na capabilities przez
**Device Profiles** (sekcja 4).

### 2.4 Collected Evidence
```
{ items: [ { evidence_type: photo|pdf|video|log|bms_export|screenshot|documentation,
             ref, hash, gps?, captured_at,
             extracted_facts: [ {fact, capability?, confidence, citation} ],
             linked_answers: [question_code] } ] }
```
Dowody są indeksowane i powiązane z odpowiedziami; wyekstrahowane fakty zasilają decyzje.

### 2.5 Current Audit State
```
{ session_id, template_id, methodology_version_id,
  answers: { question_code -> {value, status, source, confidence} },
  progress: { answered, required_total, evidence_missing },
  partial_result: { per_domain?, estimated_score?, estimated_class? },
  status: draft|started|in_progress|... }
```
`partial_result` to szacunek na bieżąco (nieoficjalny) — pełny wynik liczy silnik.

### 2.6 Pending Questions
```
{ pending: [ { question_code, priority, required, blocked_by: [capability],
               unlocks: [service], reason } ],
  skipped: [ { question_code, reason, by: rule|ai } ] }
```
Utrzymywane przez Question Selection (osobny dokument).

### 2.7 Confidence Level
```
{ per_answer: { question_code -> 0..1 },
  per_section: { section_code -> 0..1 },
  overall: 0..1,
  low_confidence: [question_code...] }
```
Szczegóły w `AI_CONFIDENCE_MODEL.md`.

### 2.8 Knowledge Base Reference
```
{ citations: [ { source_id, type: kb|catalogue|dependency,
                 snippet, relevance } ],
  active_methodology: {version, checksum} }
```
Cytaty z Bazy wiedzy (WhatsApp/PDF/YouTube/historia zgłoszeń) i katalogu SRI, użyte do
ugruntowania odpowiedzi generatywnych (RAG).

---

## 3. Cykl życia i aktualizacja kontekstu

| Warstwa | Kto aktualizuje | Kiedy |
|---|---|---|
| Conversation | AI + audytor | każda tura |
| Building | audytor / dokument / AI (inferred) | start audytu, po dokumentach |
| Devices | audytor (deklaracja) / wizja / BMS | po deklaracji lub analizie dowodu |
| Evidence | audytor (upload) + AI (ekstrakcja) | po dodaniu pliku |
| Audit State | rdzeń UAE | po każdej odpowiedzi |
| Pending Questions | Question Selection | po każdej zmianie stanu/devices |
| Confidence | Confidence Model | po odpowiedzi/dowodzie |
| KB Reference | retriever (RAG) | przed generacją odpowiedzi |

Każda zmiana warstwy generuje delta-event (spójne z `audit_event`), więc kontekst jest
odtwarzalny w dowolnym punkcie czasu.

---

## 4. Device Profiles (klucz do „Mam Loxone”)

Rejestr profili urządzeń/systemów mapujący produkt → capabilities. Dane, nie kod.

```
DeviceProfile {
  key: "Loxone",
  aliases: ["loxone miniserver", "lox"],
  category: "BACS_controller",
  provides_capabilities: [ scheduling, zone_control, central_automatic_control,
                           digital_integration, remote_access ],
  optional_capabilities:  [ energy_metering, occupancy_detection ],
  clarify_capabilities:   [ energy_metering, predictive_control, connected_domains ],
  typical_domains: [heating, cooling, lighting, blinds],
  evidence_hint: ["zrzut konfiguracji", "zdjęcie szafy sterowniczej"]
}
```

Przykładowe profile do zdefiniowania: `Loxone`, `KNX`, `BACnet`, `Modbus`, `Zennio`,
`Homematic`, `Tuya/SmartLife`, `generic_PLC`, `generic_thermostat`, `no_automation`.

Zasady:
- `provides_capabilities` → AI pomija/prefilluje odpowiednie pytania (do potwierdzenia).
- `optional_capabilities` → AI pyta, bo bywa różnie.
- `clarify_capabilities` → AI zawsze dopytuje (rozstrzygające dla FL/wyniku).
- Mapowanie capability → usługi/FL pochodzi z **Dependency Engine** (spójność z SRI).

---

## 5. Budżet kontekstu (token budget)

Aby zmieścić się w oknie modelu i utrzymać koszt:

| Priorytet | Zawartość | Strategia |
|---|---|---|
| P0 (zawsze) | Building, Devices, low_confidence, pending top-k | pełne |
| P1 | ostatnie N tur, aktywne niespójności | pełne |
| P2 | Evidence facts (nie pliki), partial_result | streszczone |
| P3 | starsza konwersacja | rolling summary |
| P4 | KB citations | tylko top-relevance, na żądanie |

Pliki (zdjęcia/PDF) **nie trafiają** do kontekstu w całości — do kontekstu idą
`extracted_facts` + referencje. To utrzymuje kontekst mały i deterministyczny.

---

## 6. Trwałość i prywatność

- Kontekst przechowywany przy sesji (`audit_session.context` + warstwy pochodne),
  odtwarzalny z `audit_event`.
- Dowody w Supabase Storage (podpisane URL), w kontekście tylko referencje + hash.
- Dane wrażliwe klienta nie są wysyłane do LLM ponad to, co konieczne (minimalizacja).
- Zgodność z regułą projektu: repozytorium/fetch bez sekretów; klucze po stronie serwera.
