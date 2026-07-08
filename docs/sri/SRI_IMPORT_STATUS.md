# SRI — Status importu (Import Status)

Stan importu danych z oficjalnego arkusza KE do katalogu Rentgen.

**Data importu:** 2026-07-08
**Wersja źródła:** `SRI calculation sheet v4.5`
**Wersja importera:** `1.0.0`
**Status:** ✅ `DATA_IMPORTED` — wyekstrahowane, zwalidowane, zapisane w katalogu JSON + migracji + seedzie.

---

## 1. Proweniencja (import-manifest.json + sri_source_imports)

| Pole | Wartość |
|---|---|
| Source Version | `SRI calculation sheet v4.5` |
| Import Date | `2026-07-08` |
| Importer Version | `1.0.0` |
| Import Hash (Excel SHA-256) | `255e1e696a8da283ffdba0c37d902e1a0b78c5d75dcbbe275268ef1e55362da5` |
| Source rozmiar | 660 869 B |
| Source Checksum (dane, SHA-256) | `fea84a1931abb38c78e6ede524120c9c3527d8330407cbe5ff10e74f06ef95a4` |
| Practical Guide PDF (SHA-256) | `50027bb329c865a0cd3ccbc7bd26c409b3ed92bff216f3c2cdae68b7ac3c5f44` (1 584 800 B) |

---

## 2. Liczniki zaimportowanych rekordów

| Element | Liczba | Provenance |
|---|---|---|
| Usługi Method B | 54 | VERIFIED_ANNEX_D |
| Usługi Method A (flaga) | 27 | VERIFIED_ANNEX_D |
| Poziomy funkcjonalności (wiersze impact) | 228 | VERIFIED_ANNEX_D |
| Wagi domen `W(d,ic)` | 630 | VERIFIED_ANNEX_D |
| Wagi kryteriów `W_f(ic)` | 14 | VERIFIED_ANNEX_D |
| Klasy SRI | 7 | VERIFIED_REGULATION |
| Domeny / kryteria / kluczowe funkcjonalności | 9 / 7 / 3 | VERIFIED |

**Wymiarowanie wag domen:** 2 typy budynku × 5 stref klimatycznych × 9 domen × 7 kryteriów = 630. ✅
**Wymiarowanie wag kryteriów:** 2 typy budynku × 7 kryteriów = 14. ✅

**Strefy klimatyczne:** `north_europe`, `west_europe`, `south_europe`, `north_east_europe`, `south_east_europe`.
**Typy budynku:** `residential`, `non_residential`.

---

## 3. Wyniki walidacji (testy spójności)

| Test | Kryterium | Wynik |
|---|---|---|
| T1 | Σ wag domen = 1 per kryterium (każdy typ budynku × strefa) | ✅ PASS |
| T2 | Σ wag kryteriów `W_f(ic)` = 1 per typ budynku | ✅ PASS |
| T3 | Każda usługa Method B ma poziomy i `FLmax ≥ 1` | ✅ PASS |
| T4 | Skala punktów (zakres, obecność wartości ujemnych) | ✅ PASS (dopuszczone ujemne) |
| — | Anomalie `#REF!` z Excela | ✅ odfiltrowane przy ekstrakcji |

---

## 4. Pipeline (odtwarzalny)

```
store/sri/SRI_calculation-sheet_v4.5.xlsx   (źródło, poza repo — .gitignore)
      │  _extract.py            (Excel → raw JSON)
      ▼
store/sri/raw/*.json            (services, impact-matrices, weights — poza repo)
      │  _validate.py           (testy spójności)
      │  _build_catalogue.py    (raw → katalog + import-manifest + checksum)
      ▼
docs/sri/catalogue/*.json       (w repo)
      │  _gen_seed_sql.py       (katalog → seed SQL)
      ▼
supabase/seed/096_sri_catalogue_seed.sql   (w repo)
```

---

## 5. Artefakty w repo

- `docs/sri/catalogue/import-manifest.json` — proweniencja.
- `docs/sri/catalogue/services-authoritative.json` — 54 usługi (kod oficjalny + wewnętrzny, FL, flagi).
- `docs/sri/catalogue/impact-scores.json` — macierze punktów.
- `docs/sri/catalogue/weights/domain-impact-weights.json`, `impact-criterion-weights.json`.
- `docs/sri/catalogue/class-bands.json`, `key-functionalities.json`, `domains.json`, `impact-criteria.json`.
- `supabase/migrations/096_sri_catalogue.sql`, `supabase/seed/096_sri_catalogue_seed.sql`.

---

## 6. Pliki poza repo (.gitignore)

`store/sri/*.xlsx`, `store/sri/*.pdf`, `store/sri/raw/` — T&C KE zabraniają redystrybucji. Tożsamość weryfikowalna hashami z `import-manifest.json`.

---

## 7. Pola wymagające uwagi

- **Nazwy PL / purpose / typical_devices** — `RECONSTRUCTED` (odtworzone przez Rentgen, nie z arkusza). Oznaczone w `curated_fields_provenance`. Można edytować, nie wpływają na obliczenia.
- **`practical_description` poziomów** — puste; opcjonalne wzbogacenie z Practical Guide PDF (przyszłość).
