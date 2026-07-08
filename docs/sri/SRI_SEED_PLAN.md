# SRI — Plan seedu (Seed Plan)

Plan zasilenia bazy danych katalogiem SRI v4.5. Bez UI, bez formularzy, bez domeny Heating jako osobnej funkcjonalności — to czysty seed danych referencyjnych.

---

## 1. Kolejność uruchomienia

| # | Plik | Co robi | Idempotentny |
|---|---|---|---|
| 1 | `supabase/migrations/096_sri_catalogue.sql` | Tworzy schemat `sri_*` + `sri_source_imports`, RLS, **seed słowników** (wersja metodologii, katalogi A/B, 9 domen, 7 kryteriów, 3 KF, 7 klas) + **rekord importu** (proweniencja) | ✅ `on conflict do nothing` |
| 2 | `supabase/seed/096_sri_catalogue_seed.sql` | Masowy seed: 54 usługi + poziomy funkcjonalności + 228 impact scores + 630 wag domen + 14 wag kryteriów | ✅ uuid5 + `on conflict do nothing` |

**Sposób uruchomienia:** Supabase SQL Editor (wklej i uruchom) lub `supabase db push` / migracja. Oba pliki bezpieczne przy ponownym uruchomieniu.

---

## 2. Zależności (musi być w tej kolejności)

```
sri_methodology_versions
  → sri_source_imports
  → sri_catalogues, sri_key_functionalities, sri_technical_domains
      → sri_impact_criteria (potrzebuje key_functionalities)
          → sri_services (potrzebuje catalogue + domain)
              → sri_functionality_levels
                  → sri_functionality_level_impact_scores (potrzebuje criteria)
          → sri_impact_criterion_weights, sri_domain_impact_weights
  → sri_class_bands
```

Migracja 096 seeduje wszystko powyżej `sri_services`. Seed (krok 2) dokłada usługi w dół.

---

## 3. Klucze i idempotencja

- Słowniki: naturalne klucze `(methodology_version_id, code)` → `on conflict do nothing`.
- Usługi/poziomy: **deterministyczne UUID (uuid5)** liczone z `catalogue_code + official_code + level` → ponowny seed nie duplikuje.
- Wagi/scores: klucze złożone + `on conflict do nothing`.

---

## 4. Weryfikacja po seedzie (SQL do ręcznego sprawdzenia)

```sql
select count(*) from sri_services;                                  -- oczekiwane: 54
select count(*) from sri_services where included_in_method_a;       -- 27
select count(*) from sri_functionality_level_impact_scores;         -- 228 * 7 (per kryterium) = 1596 wierszy scores
select count(*) from sri_domain_impact_weights;                     -- 630
select count(*) from sri_impact_criterion_weights;                  -- 14
-- Kontrola sumy wag domen = 1:
select building_type, climate_zone, impact_criterion_id, round(sum(weight)::numeric, 6) s
from sri_domain_impact_weights group by 1,2,3 having round(sum(weight)::numeric,6) <> 1;  -- 0 wierszy
```

> Uwaga: `impact_score_rows` = 228 to liczba (usługa × poziom). W tabeli scores jest 228 × 7 kryteriów = do 1596 wierszy (część z wartością 0 też zapisana).

---

## 5. Decyzje do podjęcia PRZED seedem

1. **Środowisko:** seedować najpierw na dev/staging czy od razu na produkcji? (Rekomendacja: dev → weryfikacja → prod.)
2. **Sposób wykonania:** SQL Editor vs `supabase db push`? (Repo używa dotąd ręcznych `_zastosuj_*.sql` — spójne byłoby wklejenie w SQL Editor.)
3. **Method A jako flaga czy osobny katalog?** Obecnie: flaga na usłudze (katalog `eu-method-a-2020-v4.5` istnieje jako marker bez własnych wierszy usług). Do potwierdzenia, czy to wystarcza dla przyszłego silnika.
4. **Zakres wartości `score` = 0** — czy zapisywać wiersze z punktem 0 (obecnie tak, dla kompletności), czy pomijać (mniej wierszy)? Wpływa na liczbę wierszy scores.
5. **`W_f` (wagi całkowite KF)** — czy dodać osobną tabelę teraz, czy wyliczać z `W_f(ic)` w silniku? (Nie blokuje seedu katalogu.)

---

## 6. Czego seed NIE zawiera (świadomie)

- Ocen konkretnych budynków (warstwa obliczeniowa — osobny etap).
- Pytań audytowych (wynikają z poziomów, projekt później).
- Katalogu krajowego PL (Annex VI).
- Żadnego UI ani formularzy.
