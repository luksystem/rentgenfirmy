# SRI — Knowledge Base Status

Jednostronicowy przegląd stanu bazy wiedzy SRI: co odwzorowane, czego brakuje, co wymaga weryfikacji, czy model wymaga zmian, czy można budować pytania audytowe.

**Data:** 2026-07-05
**Wersja metodologii:** `eu-2020-2155-v1` (Delegated Regulation (EU) 2020/2155 + EPBD 2024/1275 Art. 15)
**Status ogólny:** `NOT_READY_FOR_SCORING` — struktura gotowa, rdzeń liczbowy zablokowany brakiem pakietu Excel KE.

---

## 1. Podsumowanie jednym akapitem

Warstwa **normatywna** (9 domen, 7 kryteriów wpływu, 3 kluczowe funkcjonalności, wzory obliczeń, 7 klas ratingu) została odwzorowana z **publicznie dostępnego prawa UE** (Reg. 2020/2155) i jest zgodna z metodologią. Warstwa **liczbowa** (impact scores, wagi, opisy i liczba poziomów funkcjonalności, kanoniczne kody/nazwy 54 usług) **nie została zaimportowana**, bo jedyne źródło autorytatywne — **pakiet Excel / Annex D DG ENER** — jest udostępniany wyłącznie na wniosek (formularz EUSurvey + akceptacja warunków) i nie podlega automatycznemu pobraniu. Zgodnie z zasadą „nie wymyślaj punktacji”, te dane pozostają `needs_verification: true`.

---

## 2. Macierz stanu

| Warstwa | Element | Źródło | Status | Gotowe do liczenia? |
|---------|---------|--------|--------|---------------------|
| Normatywna | 9 domen technicznych | Annex IV | ✅ VERIFIED | tak |
| Normatywna | 7 impact criteria | Annex II | ✅ VERIFIED | tak |
| Normatywna | 3 key functionalities + mapowanie | Annex III / EPBD IA | ✅ VERIFIED | tak |
| Normatywna | Wzory (I..SR) | Annex I | ✅ VERIFIED | tak (silnik) |
| Normatywna | 7 klas ratingu + progi | Annex VIII | ✅ VERIFIED | tak |
| Normatywna | Zasady wag (energy balance/fixed/equal) | Annex V | ✅ VERIFIED (zasady) | nie (brak wartości) |
| Katalogowa | Lista 54 usług Method B | wtórne | ⚠️ RECONSTRUCTED | nie |
| Katalogowa | Kanoniczne kody usług | Annex D | ❌ BRAK | nie |
| Katalogowa | Poziomy funkcjonalności (opis, liczba) | Annex D | ❌ BRAK | nie |
| Liczbowa | Impact scores (FL × ic) | Annex D Excel | ❌ BRAK (blocked) | nie |
| Liczbowa | Wagi domen `W(d,ic)` | Excel | ❌ BRAK (blocked) | nie |
| Liczbowa | Wagi `W_f(ic)`, `W_f` | Excel / Annex III | ❌ BRAK (blocked) | nie |
| Liczbowa | Skala punktów (0–3?) | Annex D | ❓ NIEJEDNOZNACZNE | nie |
| Katalogowa | Method A = 27 usług | Annex C | ❌ BŁĄD (26 flag) | nie |

---

## 3. Które dane udało się odwzorować

- **9 domen** — komplet, `catalogue/domains.json` (Annex IV).
- **7 impact criteria** — komplet, `catalogue/impact-criteria.json` (Annex II) + mapowanie do 3 funkcjonalności (Annex III).
- **Wzory obliczeniowe** — komplet, `ARCHITECTURE.md §7` / `IMPORT-MAPPING.md §6.1` (Annex I).
- **7 klas ratingu** — progi %, `IMPORT-MAPPING.md §6.2` (Annex VIII).
- **Struktura modelu danych / DDL** — `DATABASE-SCHEMA.md` (wymaga drobnych zmian, §5).

## 4. Których danych brakuje (blokada = pakiet Excel niedostępny automatycznie)

- Impact scores per FL per kryterium (rdzeń liczenia).
- Wagi: domen, kryteriów w funkcjonalnościach, funkcjonalności w SR.
- Oficjalne kody, nazwy, liczba i opisy poziomów funkcjonalności 54 usług.
- Definicja skali punktów obowiązującej w wersji 2020.
- Potwierdzony skład Method A (27).

## 5. Które dane wymagają ręcznej weryfikacji (`needs_verification: true`)

Oznaczone flagą w `method-b-services.json` (globalnie) oraz wylistowane w `VALIDATION-GAP-PLAN.md §2` (V1–V10). Najważniejsze: skala punktów (V10), macierze scores (V1), wagi (V6–V8), kody/nazwy usług (V3–V4).

---

## 6. Czy model danych wymaga zmian?

**TAK, drobne** (szczegóły `VALIDATION-GAP-PLAN.md §4`):

1. Dodać tabelę `sri_key_functionality_total_weights` (`W_f`) — obecnie brak.
2. `sri_services`: `official_code`, `provenance`, `needs_verification`.
3. `sri_functionality_level_impact_scores`: dopuścić wartości ujemne; dodać `needs_verification`.
4. `sri_catalogues`: `score_scale`, `completeness_status`.
5. Referencje prawne per usługa (nie tylko per domena).

Zmiany **nie** naruszają dotychczasowej architektury — to rozszerzenia.

---

## 7. Czy jesteśmy gotowi do budowy pytań audytowych?

**NIE.**

Pytania audytowe wynikają z **poziomów funkcjonalności** i ich opisów (Annex D). Bez zaimportowanych, potwierdzonych FL i impact scores każde pytanie byłoby zgadywaniem, co łamie zasadę etapu.

**Warunek odblokowania:** spełnienie kryteriów wyjścia z `VALIDATION-GAP-PLAN.md §6` (obecnie 0/9 dla rdzenia liczbowego).

---

## 8. Rekomendowany następny krok

1. **Decyzja użytkownika/organizacji:** złożyć wniosek o pakiet oceny SRI ([EUSurvey](https://ec.europa.eu/eusurvey/runner/SRI-assessment-package)) i zaakceptować T&C — to jedyna legalna droga do autorytatywnych danych liczbowych.
2. Po otrzymaniu Excela: uruchomić import wg `IMPORT-MAPPING.md §7`.
3. Dopiero po `READY_FOR_SCORING`: projekt pytań audytowych (osobny etap).

> Alternatywnie: jeśli docelowo liczy się zgodność z **polskim** wdrożeniem SRI, poczekać na krajowy katalog MS (Annex VI) i zaimportować go jako `catalogue: pl-national`.
