# SRI — Handoff na następną sesję (import Excela)

Krótka notatka startowa. Gdy będzie plik Excel KE, zacznij stąd.

## Status zamrożony na: 2026-07-05
- **Ogólny status bazy:** `NOT_READY_FOR_SCORING`.
- Warstwa normatywna (9 domen, 7 kryteriów, 3 funkcjonalności, wzory, 7 klas) = odwzorowana z prawa UE (Reg. 2020/2155).
- Warstwa liczbowa (impact scores, wagi, poziomy funkcjonalności, kody/nazwy 54 usług) = **BRAK** — czeka na oficjalny pakiet Excel.

## Dlaczego czekamy
Autorytatywne dane liczbowe są **tylko** w pakiecie Excel DG ENER, dostępnym po wniosku:
https://ec.europa.eu/eusurvey/runner/SRI-assessment-package (formularz + akceptacja Terms & Conditions).
Publiczny raport BEAMA/2018 = inna, przestarzała metodologia (11 domen, 8 kryteriów, 112 usług) — **NIE używać** do punktacji.

## Gdy plik będzie dostępny — checklista wznowienia
1. Wrzuć skoroszyt do `docs/sri/source-excel/` (preferowana wersja EN, `.xlsx`; jak jest, dołóż practical guide PDF).
2. Odczytaj strukturę: lista zakładek + nagłówki (bez interpretacji).
3. Import wg `IMPORT-MAPPING.md §7`:
   - usługi → `official_code` + nazwy (zastąp zrekonstruowane),
   - poziomy funkcjonalności (opisy, liczba),
   - macierze impact scores (FL × 7 kryteriów; **dozwolone wartości ujemne**),
   - wagi domen `W(d,ic)`, wagi `W_f(ic)`, `W_f`,
   - applicability / triage.
4. Testy spójności: Σ wag domen = 100% per kryterium; Σ W_f = 1; FLmax zgodny z macierzą; potwierdź skalę punktów.
5. Popraw znane błędy: Method A = **27** (obecnie 26 flag); provenance → `VERIFIED_ANNEX_D`; zdejmij `needs_verification`.
6. Zaktualizuj `SRI-KNOWLEDGE-BASE-STATUS.md` (kryteria wyjścia §6 → 9/9) i dopiero potem projekt pytań audytowych.

## Pliki do przeczytania w pierwszej kolejności (kontekst pełny)
- `SRI-KNOWLEDGE-BASE-STATUS.md` — stan ogólny i macierz.
- `VALIDATION-GAP-PLAN.md` — luki V1–V10, błędy E1–E4, zmiany modelu §4, kryteria gotowości §6.
- `IMPORT-MAPPING.md` — kontrakt mapowania Excel→DB, reguły anty-konfabulacyjne, checklista 54 usług.

## Zmiany modelu do wykonania przy imporcie (z VALIDATION-GAP-PLAN §4)
1. Nowa tabela `sri_key_functionality_total_weights` (`W_f`, Σ=1).
2. `sri_services`: `official_code`, `provenance`, `needs_verification`.
3. `sri_functionality_level_impact_scores`: dopuścić ujemne, dodać `needs_verification`.
4. `sri_catalogues`: `score_scale`, `completeness_status`.
5. Referencje prawne per usługa.

## Uwaga techniczna
Do czytania `.xlsx`: Node `xlsx` (SheetJS) albo Python `openpyxl`. Nic nie instaluj z góry — dobiorę po zobaczeniu pliku.
