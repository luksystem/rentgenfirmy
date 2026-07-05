# SRI — Import Mapping (Annex D / pakiet Excel → model danych Rentgen)

Dokument definiuje **jak** dane z oficjalnego pakietu Excel KE mapują się na model danych Rentgen. Wypełnienie wartościami nastąpi **po** pozyskaniu Excela (patrz `VALIDATION-GAP-PLAN.md §0`). Tu ustalamy kontrakt mapowania, bez wpisywania punktacji.

**Legenda statusu:**
- `IMPORTED` — odwzorowane z oficjalnego źródła publicznego.
- `PENDING_EXCEL` — mapowanie gotowe, dane czekają na pakiet Excel.
- `NEEDS_FIX` — wykryty błąd do korekty przy imporcie.

---

## 1. Struktura pakietu Excel (oczekiwana, wg practical guide DG ENER)

| Arkusz (typ) | Zawartość | Cel importu |
|--------------|-----------|-------------|
| Zakładki domen (×9) | usługi, functionality levels, impact scores (7 kryteriów), market uptake, inspection time | `sri_services`, `sri_functionality_levels`, `sri_functionality_level_impact_scores` |
| Weighting (domains) | `W(d,ic)` per building type × climate zone | `sri_domain_impact_weights` |
| Weighting (impact/KF) | `W_f(ic)`, `W_f` | `sri_key_functionality_impact_weights`, `sri_key_functionality_total_weights` |
| Method A vs B | flaga przynależności usługi | `included_in_method_a` / relacja katalog |
| Rating | progi klas | `sri_class_bands` (już z Annex VIII) |

> Dokładne nazwy zakładek do potwierdzenia po otrzymaniu pliku (`needs_verification`).

---

## 2. Mapowanie encji

| Element metodologii (Annex D/Excel) | Tabela Rentgen | Plik JSON | Status |
|-------------------------------------|----------------|-----------|--------|
| Technical domain | `sri_technical_domains` | `catalogue/domains.json` | **IMPORTED** (Annex IV) |
| Impact criterion | `sri_impact_criteria` | `catalogue/impact-criteria.json` | **IMPORTED** (Annex II) |
| Key functionality | `sri_key_functionalities` | `catalogue/key-functionalities.json` (do utworzenia) | **IMPORTED** (Annex III) |
| Smart-ready service | `sri_services` | `catalogue/method-b-services.json` | **NEEDS_FIX / PENDING_EXCEL** |
| Functionality level | `sri_functionality_levels` | `catalogue/functionality-levels/*` (do utworzenia) | **PENDING_EXCEL** |
| Impact score (FL×ic) | `sri_functionality_level_impact_scores` | `catalogue/impact-score-matrices/*` (do utworzenia) | **PENDING_EXCEL** |
| Domain weight | `sri_domain_impact_weights` | `catalogue/weights/domain-impact-weights.json` | **PENDING_EXCEL** |
| Impact-in-KF weight | `sri_key_functionality_impact_weights` | `catalogue/weights/kf-impact-weights.json` | **PENDING_EXCEL** |
| KF total weight `W_f` | `sri_key_functionality_total_weights` (NOWA) | `catalogue/weights/kf-total-weights.json` | **PENDING_EXCEL** |
| Rating class | `sri_class_bands` | `catalogue/class-bands.json` (do utworzenia) | **IMPORTED** (Annex VIII) |
| Reference | `sri_official_references` + junctions | `catalogue/official-references.json` | częściowo |

---

## 3. Mapowanie pól usługi (Excel → JSON/DB)

| Kolumna Excel (oczekiwana) | Pole Rentgen | Uwaga |
|----------------------------|--------------|-------|
| Service ID (np. `Heating-1a`) | `services[].official_code` | **DODAĆ** — obecnie brak |
| Service name | `services[].official_name.en` | zastąpić zrekonstruowane nazwy |
| Domain | `services[].domain_code` | walidować względem 9 domen |
| Functionality level N — description | `functionality_levels[].official_description` | per poziom |
| Impact score (level, criterion) | `functionality_level_impact_scores[].score` | **nie wpisywać ręcznie** |
| Method A membership | `services[].included_in_method_a` | poprawić licznik → 27 |
| Applicability / triage | `services[].applicability_mode`, `mutual_exclusion_group` | rozszerzyć wg guide |
| Standard reference | `services[].standards_basis[]` + `official-references.json` | EN ISO 52120-1 itd. |

---

## 4. Reguły importu (twarde, wymuszają brak konfabulacji)

1. **Score bez źródła = null + `needs_verification: true`.** Nigdy wartość domyślna.
2. **Kod usługi** przechowywany dwutorowo: `official_code` (z Annex D) + `internal_code` (`H-01`, stabilny w Rentgen). Mapowanie 1:1 zapisane w `IMPORT-MAPPING` po imporcie.
3. **Skala punktów** ustalana raz na katalog (`sri_catalogues.score_scale`); wszystkie score walidowane względem niej.
4. **Wartości ujemne dozwolone** (metodologia dopuszcza negatywne impacty) — schemat nie może mieć CHECK `score >= 0`.
5. **Sumy wag** walidowane po imporcie: `Σ_d W(d,ic) = 100%` dla każdego ic; `Σ_f W_f = 1`.
6. **FLmax** usługi = najwyższy `level_number` obecny w macierzy; nie zakładać z góry.
7. Każdy rekord dostaje `provenance` (`VERIFIED_ANNEX_D` | `RECONSTRUCTED` | `MS_NATIONAL`).

---

## 5. Tabela weryfikacji 54 usług (kontrola kompletności)

Poniższa tabela to **checklista zgodności** obecnego `method-b-services.json` z Annex D. Kolumny „Annex D” pozostają puste do importu.

| internal_code | Nazwa (zrekonstruowana) | Domena | official_code (Annex D) | FL count (Annex D) | Scores (Annex D) | Status |
|---------------|--------------------------|--------|--------------------------|---------------------|-------------------|--------|
| H-01 … H-10 | Heating (10) | heating | — | — | — | PENDING_EXCEL |
| DHW-01 … DHW-05 | DHW (5) | domestic_hot_water | — | — | — | PENDING_EXCEL |
| C-01 … C-10 | Cooling (10) | cooling | — | — | — | PENDING_EXCEL |
| V-01 … V-06 | Ventilation (6) | ventilation | — | — | — | PENDING_EXCEL |
| L-01 … L-02 | Lighting (2) | lighting | — | — | — | PENDING_EXCEL |
| E-01 … E-03 | Dynamic envelope (3) | dynamic_building_envelope | — | — | — | PENDING_EXCEL |
| EL-01 … EL-07 | Electricity (7) | electricity | — | — | — | PENDING_EXCEL |
| EV-01 … EV-03 | EV charging (3) | electric_vehicle_charging | — | — | — | PENDING_EXCEL |
| M-01 … M-08 | Monitoring & control (8) | monitoring_and_control | — | — | — | PENDING_EXCEL |

**Suma: 54 pozycje** (liczba zgodna z Method B). Skład i nazwy — do potwierdzenia.

---

## 6. Weryfikowane elementy zaimportowane w tym etapie

### 6.1 Wzory (Annex I) — kontrakt obliczeniowy

```
I(d,ic)      = Σ_i  I_ic( FL(S_i,d) )
Imax(d,ic)   = Σ_i  I_ic( FLmax(S_i,d) )
SR(d,ic)     = I(d,ic) / Imax(d,ic) × 100%
SR_ic        = Σ_d  W(d,ic) × SR(d,ic) / 100
SR_f         = Σ_ic W_f(ic) × SR_ic / 100
SR (total)   = Σ_f  W_f × SR_f            ,  Σ_f W_f = 1
```

Zmienne `I_ic(...)`, `W(d,ic)`, `W_f(ic)`, `W_f` = `PENDING_EXCEL`.

### 6.2 Klasy ratingu (Annex VIII) — do zapisania w `class-bands.json`

| class | min % | max % |
|-------|-------|-------|
| A (1) | 90 | 100 |
| B (2) | 80 | <90 |
| C (3) | 65 | <80 |
| D (4) | 50 | <65 |
| E (5) | 35 | <50 |
| F (6) | 20 | <35 |
| G (7) | 0 | <20 |

> Litery A–G orientacyjne (Reg. mówi o 7 klasach i progach; oznaczenie literowe może różnić się per MS — `needs_verification` dla etykiet literowych).

---

## 7. Kolejność wykonania importu (po pozyskaniu Excela)

1. `key-functionalities.json`, `class-bands.json` (już z prawa) → commit.
2. Parser Excel → surowe CSV per zakładka (bez transformacji).
3. Walidacja nagłówków vs kontrakt §3.
4. Transform → JSON (`services`, `functionality-levels`, `impact-score-matrices`, `weights`).
5. Testy spójności §4.
6. Aktualizacja `provenance` i zdjęcie `needs_verification`.
7. Aktualizacja `SRI-KNOWLEDGE-BASE-STATUS.md`.
