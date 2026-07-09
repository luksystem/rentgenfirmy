# AI Audit Assistant

> Warstwa asystenta AI nad Universal Audit Engine. Etap: **projekt architektury**.
> Bez UI, bez modeli AI, bez kodu. AI aktywnie prowadzi audytora, ale jest doradcze i ugruntowane.

Powiązane:
- `AI_DECISION_ENGINE.md` — jak AI podejmuje decyzje
- `AI_CONTEXT_MODEL.md` — kontekst, na którym AI operuje
- `AI_QUESTION_SELECTION.md` — dobór / pomijanie / dodawanie pytań
- `AI_CONFIDENCE_MODEL.md` — model pewności
- `../UNIVERSAL_AUDIT_ENGINE.md`, `../AUDIT_EXECUTION_FLOW.md`, `../AUDIT_DATA_MODEL.md`
- `../../sri/dependency/*` (Dependency Engine), `../../sri/recommendation/*` (Recommendation Engine)
- Baza wiedzy (`lib/knowledge/*`, `store/knowledge-store.ts`) + AI wizji (`lib/ai/knowledge-image-analyzer.ts`)

---

## 1. Cel

AI ma **prowadzić audytora przez budynek**, a nie tylko odpowiadać na pytania.
To aktywny współpilot audytu: analizuje, przewiduje, podpowiada następny krok, pilnuje
kompletności i jakości danych.

Różnica:

| Pasywne AI (nie to) | Aktywny asystent (to) |
|---|---|
| odpowiada, gdy zapytasz | sam proponuje następne pytania i akcje |
| nie zna stanu audytu | zna cały kontekst sesji i budynku |
| nie wie, co pominąć | pomija zbędne pytania na podstawie zależności |
| nie waliduje | wykrywa niespójności na bieżąco |
| ogólne odpowiedzi | ugruntowane na katalogu SRI i bazie wiedzy |

---

## 2. Zdolności (capabilities)

AI Audit Assistant potrafi:

1. **Analizować odpowiedzi** — rozumieć, co już wiadomo o budynku.
2. **Proponować kolejne pytania** — najbardziej wartościowe informacyjnie (patrz `AI_QUESTION_SELECTION.md`).
3. **Pomijać zbędne pytania** — gdy odpowiedź wynika już z kontekstu/urządzeń.
4. **Wykrywać niespójności** — sprzeczne odpowiedzi, nierealne wartości, brakujące zależności.
5. **Sugerować zdjęcia** — gdy dowód wizualny podniesie pewność / jest wymagany.
6. **Sugerować pomiary** — gdy pomiar rozstrzyga niepewność (np. temperatura, CO₂, moc).
7. **Analizować przesłane zdjęcia** — rozpoznanie urządzeń/instalacji (wizja).
8. **Analizować dokumentację** — DTR, schematy, protokoły (ekstrakcja faktów).
9. **Analizować eksporty z BMS** — potwierdzenie funkcji sterowania/monitoringu.
10. **Wskazywać brakujące informacje** — luki blokujące wyższe poziomy / wynik.
11. **Proponować rekomendacje** — na podstawie wykrytych braków (przez Recommendation Engine).

**Wszystkie wyjścia AI są propozycjami.** Ostateczna odpowiedź należy do audytora,
a wynik liczy deterministyczny silnik (patrz sekcja 6 „Granice”).

---

## 3. Kanoniczny przykład: „Mam Loxone”

```
Audytor: "Mam Loxone"
   │
   ▼
AI (Decision Engine + Device Profile "Loxone"):
   • ROZPOZNAJE system: kontroler automatyki (BACS) z komunikacją i integracją
   • WNIOSKUJE capabilities: scheduling, zone_control, digital_integration,
     remote_access, central_automatic_control, (często) energy_metering
   • POMIJA pytania: "czy jest harmonogram?", "czy jest sterowanie strefowe?",
     "czy jest zdalny dostęp?"  -> prefill = tak (source=ai_suggested, do potwierdzenia)
   • DODAJE pytania doprecyzowujące:
       - "Które domeny są podłączone do Loxone? (ogrzewanie/chłodzenie/oświetlenie/rolety)"
       - "Czy Loxone integruje liczniki energii?"
       - "Czy jest predykcja/optymalizacja czy tylko harmonogramy?"
   • WSKAZUJE braki: brak potwierdzenia czujników CO₂ -> blokuje wysokie FL wentylacji
   • SUGERUJE dowód: zrzut ekranu konfiguracji Loxone / zdjęcie szafy sterowniczej
   • AKTUALIZUJE Installed Devices + Confidence
```

Efekt: audytor odpowiada na mniej pytań, a te które zostają są celniejsze.

---

## 4. Pętla interakcji (współpraca człowiek–AI)

```
        ┌─────────────────────────────────────────────────────┐
        │  audytor: odpowiedź / zdjęcie / dokument / komenda   │
        └───────────────────────┬─────────────────────────────┘
                                 ▼
                 ┌──────────────────────────────┐
                 │  1. UPDATE CONTEXT            │  (AI_CONTEXT_MODEL)
                 │  wpisz odpowiedź/evidence,    │
                 │  zaktualizuj devices/state    │
                 └───────────────┬──────────────┘
                                 ▼
                 ┌──────────────────────────────┐
                 │  2. DECIDE                    │  (AI_DECISION_ENGINE)
                 │  analiza + wykrycie akcji     │
                 └───────────────┬──────────────┘
                                 ▼
                 ┌──────────────────────────────┐
                 │  3. ACTIONS (propozycje)      │
                 │  next_questions / skip /      │
                 │  request_photo / request_meas │
                 │  inconsistency / recommend    │
                 └───────────────┬──────────────┘
                                 ▼
                 ┌──────────────────────────────┐
                 │  4. AUDITOR CONFIRMS/REJECTS  │  (człowiek decyduje)
                 └───────────────┬──────────────┘
                                 ▼
                        powrót do pętli
```

AI działa w tle całego `AUDIT_EXECUTION_FLOW` (kroki RENDER LOOP, EVIDENCE, RULES),
nie zastępując go, lecz przyspieszając.

---

## 5. Ugruntowanie (grounding) — skąd AI wie

AI nie „zgaduje” — jego wnioski są zakotwiczone w istniejących źródłach:

| Źródło | Do czego |
|---|---|
| Dependency Engine (`SRI_DEPENDENCY_GRAPH.json`, `SRI_CAPABILITIES_CATALOG.json`) | które capability wymaga które usługi/FL, co blokuje wyższy poziom |
| Blocking Conditions (`SRI_BLOCKING_CONDITIONS.md`) | wskazywanie braków blokujących |
| Recommendation Engine (`SRI_RECOMMENDATION_GRAPH.json`) | propozycje rekomendacji |
| Knowledge Base (Baza wiedzy) | wiedza firmowa, WhatsApp/PDF/YouTube, historia zgłoszeń |
| Methodology Version Engine | aktualne wagi/impact scores, wersja metodologii |
| Device Profiles (patrz `AI_CONTEXT_MODEL`) | mapowanie urządzeń → capabilities |
| Wizja AI (`knowledge-image-analyzer`) | rozpoznanie ze zdjęć |

Zasada RAG: odpowiedzi generatywne są **wsparte cytowaniem** źródła (capability/usługa/
dokument z bazy wiedzy), a nie samą pamięcią modelu.

---

## 6. Granice (co AI robi, a czego NIE)

**AI robi:**
- proponuje pytania, pomijanie, dowody, pomiary, rekomendacje,
- prefilluje odpowiedzi jako `source=ai_suggested` z `confidence`,
- wykrywa niespójności i luki,
- streszcza dokumenty/zdjęcia/eksporty BMS.

**AI NIE robi:**
- nie liczy oficjalnego wyniku SRI (robi to deterministyczny `sri_engine`),
- nie zmienia wag/impact scores/metodologii,
- nie zatwierdza audytu (lifecycle: człowiek),
- nie nadpisuje odpowiedzi audytora bez potwierdzenia,
- nie omija bramek walidacji/evidence rdzenia UAE.

Każda decyzja wpływająca na wynik przechodzi przez potwierdzenie człowieka i deterministyczny
silnik. To gwarantuje audytowalność i zgodność metodologiczną.

---

## 7. Tryby pracy

| Tryb | Opis |
|---|---|
| Co-pilot (domyślny) | AI proponuje, audytor potwierdza. |
| Autofill (opcjonalny) | AI prefilluje z wysoką pewnością; audytor tylko przegląda. |
| Review | AI po zakończeniu audytu wskazuje luki/niespójności przed walidacją. |
| Report draft | AI generuje szkic narracji raportu z kanonicznego wyniku. |

Poziom autonomii jest konfigurowalny per rodzina szablonu i respektuje progi pewności
(`AI_CONFIDENCE_MODEL.md`).

---

## 8. Integracja z pipeline UAE

| Krok UAE | Wkład AI |
|---|---|
| BUILD QUESTION PLAN | reorder/priorytet pytań wg wartości informacyjnej |
| RENDER LOOP → visibility | propozycje skip/branch z Device Profiles + Dependency Engine |
| CAPTURE ANSWER | prefill, walidacja semantyczna, wykrycie nierealnych wartości |
| CAPTURE EVIDENCE | analiza zdjęć/PDF/BMS, wskazanie brakujących dowodów |
| RULES ENGINE | miękkie ostrzeżenia (niespójności) obok twardych reguł |
| RECOMMENDATIONS | wstępne propozycje przed uruchomieniem silnika |
| REPORT | draft narracji, wyjaśnienia dla klienta |

AI jest warstwą **przekrojową** — wpina się w istniejące kroki, nie tworzy równoległego procesu.
