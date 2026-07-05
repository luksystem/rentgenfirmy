# SRI — Validation & Gap Plan (import rdzenia obliczeniowego)

**Cel etapu:** potwierdzić, że baza wiedzy SRI jest zgodna z oficjalną metodologią KE i nadaje się do liczenia wyniku — na podstawie **oficjalnego pakietu Excel / Annex D**, bez wymyślania danych.

**Data:** 2026-07-05
**Zasada nadrzędna:** żadna wartość punktowa/wagowa nie jest wpisywana „z głowy”. Brak jednoznacznego źródła → `needs_verification: true` + opis problemu.

---

## 0. Wynik krytyczny — dostępność źródła autorytatywnego

| Źródło | Zawiera | Dostępność | Werdykt |
|--------|---------|-----------|---------|
| **Pakiet oceny SRI (Excel + practical guide), DG ENER** | Katalog 54 usług, poziomy FL, **macierze impact scores**, **wagi domen i kryteriów** | **Za formularzem** [EUSurvey](https://ec.europa.eu/eusurvey/runner/SRI-assessment-package) + akceptacja Terms & Conditions; wysyłany mailem przez `support@smartreadinessindicator.eu` | **NIEDOSTĘPNY do pobrania automatycznego** |
| Delegated Regulation (EU) 2020/2155 (EUR-Lex) | Domeny (IV), kryteria (II), wagi zasady (III, V), wzory (I), klasy (VIII) | Publiczny | **DOSTĘPNY — użyty** |
| Final report DG ENER 2020 (op.europa.eu / energyville) | Opis metodologii, liczby (54/27), triage | Publiczny | **DOSTĘPNY — użyty (kontekst, nie punktacja)** |
| Raport BEAMA / 1. studium 2018 | 112 usług, **11 domen, 8 kryteriów, skala 9-poziomowa** | Publiczny | **ODRZUCONY — inna, przestarzała metodologia; NIE używać do scoringu** |
| SRI Observatory / REHVA / artykuły | Wzory, potwierdzenie struktury | Publiczny | Użyte tylko do walidacji krzyżowej wzorów |

### Konsekwencja

Nie da się w tym etapie zaimportować:
- macierzy **impact scores** (FL × 7 kryteriów),
- oficjalnych **wag domen** `W(d,ic)` i **wag kryteriów** `W_f(ic)`, `W_f`,
- oficjalnych **opisów poziomów funkcjonalności** i ich liczby per usługa,
- kanonicznych **kodów i nazw** 54 usług.

Wszystkie powyższe pozostają `needs_verification: true` do czasu pozyskania pakietu Excel.

> **To NIE jest porażka importu — to zabezpieczenie zgodności.** Import z niekompletnych/wtórnych źródeł złamałby zasadę „nie wymyślaj punktacji”.

---

## 1. Co JEST potwierdzone z oficjalnych źródeł publicznych (import możliwy i wykonany)

| Element | Źródło autorytatywne | Status | Plik |
|---------|---------------------|--------|------|
| 9 domen technicznych | Reg. 2020/2155 **Annex IV** | **VERIFIED** | `catalogue/domains.json` |
| 7 impact criteria | Reg. 2020/2155 **Annex II** | **VERIFIED** | `catalogue/impact-criteria.json` |
| 3 key functionalities + mapowanie kryteriów | **Annex III** + EPBD Annex IA | **VERIFIED** | do dodania: `catalogue/key-functionalities.json` |
| Wzory obliczeń (kroki a–g) | **Annex I** | **VERIFIED** | `ARCHITECTURE.md §7` |
| 7 klas ratingu i progi % | **Annex VIII** | **VERIFIED** | do dodania: `catalogue/class-bands.json` |
| Zasady wag (energy balance / fixed / equal; Σ=100% per ic; Σ W_f=1) | **Annex V, III, I** | **VERIFIED (zasady, nie wartości)** | `ARCHITECTURE.md` |
| Skala porządkowa, 2–5 FL per usługa | Final report 2020 | **VERIFIED (ogólnie)** | — |
| Liczności: Method B = 54, Method A = 27 | Final report 2020 | **VERIFIED (liczba)** | — |

### Uwaga o skali punktów

- Reg. 2020/2155 **nie podaje liczbowej skali** impact scores — deleguje to do katalogu (Annex VI / pakiet Excel).
- Wcześniejsza dokumentacja Rentgen zakładała skalę **0–3**. Literatura wtórna (ALDREN, artykuły) wskazuje 0–3, ale **1. studium 2018 używało 9-poziomowej skali (−−−− … ++++)**.
- **Skala punktacji 2020 → `needs_verification: true`** do potwierdzenia w pakiecie Excel.

---

## 2. Co WYMAGA weryfikacji (blokada = brak pakietu Excel)

| ID | Element | Problem | Blokada |
|----|---------|---------|---------|
| V1 | Impact scores (FL × ic) dla 54 usług | Brak jakiegokolwiek publicznego, autorytatywnego zbioru | Excel EC |
| V2 | Liczba i opisy FL per usługa | `level_count` w JSON jest szacunkiem, nie z Annex D | Excel EC |
| V3 | Kanoniczne kody usług | Rentgen używa `H-01`; oficjalne to `Heating-1a` itp. | Excel EC |
| V4 | Dokładne nazwy 54 usług | Zrekonstruowane z GO GREEN/Auto-DAN, nie z Annex D | Excel EC |
| V5 | Skład Method A (27 usług) | Obecnie 26 flag `true` (błąd) + niezweryfikowany subset | Annex C Excel |
| V6 | Wagi domen `W(d,ic)` per building type × climate zone | Wartości tylko w Excel | Excel EC |
| V7 | Wagi kryteriów `W_f(ic)` (Annex III) | MS-defined; default w Excel | Excel EC |
| V8 | Wagi kluczowych funkcjonalności `W_f` | Default w Excel | Excel EC |
| V9 | Reguły triage (mandatory / mutually exclusive) | Częściowo opisane, brak pełnej listy | Excel EC + guide |
| V10 | Skala punktów (0–3 vs inna) | Sprzeczne sygnały między wersjami metodologii | Excel EC |

---

## 3. Co jest BŁĘDNE i musi zostać skorygowane po imporcie

| ID | Błąd | Obecny stan | Docelowo |
|----|------|-------------|----------|
| E1 | Licznik Method A | 26 usług `included_in_method_a: true` | 27 (wg Annex C) |
| E2 | Provenance katalogu | Oznaczony (po tej zmianie) `RECONSTRUCTED_FROM_SECONDARY_SOURCES` | `VERIFIED_ANNEX_D` po imporcie |
| E3 | Kody usług | Wewnętrzne `H-01` bez `official_code` | dodać `official_code` z Annex D |
| E4 | Brak `needs_verification` per pole | Flaga tylko globalna | flagi per usługa/pole po imporcie |

---

## 4. Zmiany w modelu danych wymagane przed importem

(Szczegóły w `IMPORT-MAPPING.md`. Zmian dokonamy dopiero po pozyskaniu Excela — tu tylko lista.)

1. `sri_services`: dodać `official_code`, `provenance`, `needs_verification`, `level_count_verified`.
2. `sri_functionality_levels`: dodać `needs_verification`.
3. `sri_functionality_level_impact_scores`: dodać `needs_verification`, dopuścić **wartości ujemne** (`score smallint` bez CHECK ≥0), dodać kolumnę `score_scale` na poziomie katalogu.
4. **Nowa tabela** `sri_key_functionality_total_weights` (`W_f`, Σ=1) — brakowała w `DATABASE-SCHEMA.md`.
5. `sri_catalogues`: dodać `score_scale` (np. `ordinal_0_3` | `ordinal_9pt`) i `completeness_status`.
6. `sri_official_references`: powiązania **per usługa** (nie tylko per domena).

---

## 5. Plan pozyskania danych (kolejność)

1. **Złożyć wniosek** o pakiet oceny SRI: [EUSurvey form](https://ec.europa.eu/eusurvey/runner/SRI-assessment-package) → mail z Excel + practical guide. *(akcja człowieka — decyzja użytkownika/organizacji, wymaga akceptacji T&C)*.
2. Z Excela wyodrębnić zakładki domen → arkusz per domena zawiera: usługi, FL, impact scores, uptake, inspection time.
3. Wyodrębnić arkusz wag (domain × ic × building type × climate) i wag kryteriów/funkcjonalności.
4. Zmapować do struktury Rentgen wg `IMPORT-MAPPING.md`.
5. Zaznaczyć wszystkie pola jako `provenance: VERIFIED_ANNEX_D`, zdjąć `needs_verification`.
6. Test spójności: Σ wag domen = 100% per ic; Σ W_f = 1; FLmax zgodny z macierzą.

### Alternatywa (jeśli pakiet niedostępny organizacyjnie)

- Wykorzystać **oficjalny katalog krajowy PL** (jeśli/gdy MS opublikuje) jako `catalogue: pl-national`.
- Do tego czasu baza pozostaje w statusie `NOT_READY_FOR_SCORING`.

---

## 6. Definicja „gotowości do liczenia wyniku” (kryteria wyjścia)

Baza jest gotowa dopiero gdy **wszystkie** poniższe = TRUE:

- [ ] 54 usługi Method B z `official_code` i nazwą z Annex D
- [ ] 27 usług Method A potwierdzonych (Annex C)
- [ ] każda usługa ma komplet FL z opisami (Annex D)
- [ ] każdy FL ma komplet impact scores dla 7 kryteriów (macierz)
- [ ] skala punktów potwierdzona
- [ ] wagi domen `W(d,ic)` dla min. 1 profilu (building type × climate zone)
- [ ] wagi `W_f(ic)` i `W_f`
- [ ] progi klas (Annex VIII) — już VERIFIED
- [ ] testy spójności sum wag przechodzą

**Stan obecny: 0/9 spełnionych dla rdzenia obliczeniowego** (pozycje strukturalne gotowe, dane liczbowe zablokowane).

---

## 7. Czy jesteśmy gotowi do budowy pytań audytowych?

**NIE.** Pytania audytowe = pochodna poziomów funkcjonalności i ich opisów (Annex D). Bez potwierdzonych FL i impact scores pytania byłyby zgadywaniem. Gotowość do pytań audytowych dopiero po spełnieniu kryteriów z §6.
