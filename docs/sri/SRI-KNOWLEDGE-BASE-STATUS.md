# SRI — Knowledge Base Status

Jednostronicowy przegląd stanu bazy wiedzy SRI: co odwzorowane, źródło, proweniencja, mechanizm aktualizacji.

**Data:** 2026-07-08
**Wersja metodologii:** `eu-2020-2155-v1` (Delegated Regulation (EU) 2020/2155 + Implementing Reg. 2020/2156)
**Wersja źródła danych:** `SRI calculation sheet v4.5` (oficjalny arkusz KE)
**Status ogólny:** `DATA_IMPORTED` — pełny rdzeń liczbowy wyekstrahowany z oficjalnego arkusza KE i zwalidowany. Katalog JSON + migracja + seed SQL gotowe.

---

## 1. Podsumowanie jednym akapitem

Warstwa **normatywna** (9 domen, 7 kryteriów, 3 kluczowe funkcjonalności, 7 klas ratingu) oraz warstwa **liczbowa** (54 usługi Method B, 27 Method A, 228 wierszy impact scores, 630 wag domen `W(d,ic)` dla 2 typów budynku × 5 stref klimatycznych, 14 wag kryteriów `W_f(ic)`) zostały **wyekstrahowane z oficjalnego arkusza KE `SRI calculation sheet v4.5`** i przeszły testy spójności (sumy wag = 1, FLmax, zakres punktów z dopuszczeniem wartości ujemnych). Każdy import zapisuje **proweniencję** (hash pliku Excel, checksum danych, wersja importera), więc gdy KE wyda SRI v5.0, można zaimportować nową wersję jako nowy katalog i porównać różnice bez przebudowy systemu.

---

## 2. Macierz stanu

| Warstwa | Element | Źródło | Status |
|---------|---------|--------|--------|
| Normatywna | 9 domen technicznych | Annex IV | ✅ VERIFIED |
| Normatywna | 7 impact criteria + mapowanie na 3 KF | Annex II/III | ✅ VERIFIED |
| Normatywna | 7 klas ratingu + progi | Annex VIII | ✅ VERIFIED |
| Katalogowa | 54 usługi Method B (kody oficjalne + wewnętrzne) | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Katalogowa | 27 usług Method A (flaga) | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Katalogowa | Poziomy funkcjonalności (opisy, FLmax) | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Liczbowa | Impact scores (FL × 7 kryteriów), 228 wierszy | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Liczbowa | Wagi domen `W(d,ic)`, 630 wierszy | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Liczbowa | Wagi kryteriów `W_f(ic)`, 14 wierszy | Excel v4.5 | ✅ VERIFIED_ANNEX_D |
| Kuratorska | Nazwy PL, purpose, typical_devices | Rentgen (odtworzone) | ⚠️ RECONSTRUCTED |

> Pola kuratorskie (PL/purpose/devices) mają flagę `curated_fields_provenance: RECONSTRUCTED` w `services-authoritative.json` — nie pochodzą z arkusza KE i można je swobodnie edytować.

---

## 3. Artefakty

| Plik | Zawartość |
|------|-----------|
| `catalogue/import-manifest.json` | **Proweniencja**: source_version, import_date, import_hash (Excel SHA-256), source_checksum (dane), importer_version, liczniki |
| `catalogue/services-authoritative.json` | 54 usługi: kod oficjalny+wewnętrzny, domena, FL, flagi Method A/B, triage, preconditions |
| `catalogue/impact-scores.json` | Macierze punktów (FL × 7 kryteriów) per usługa |
| `catalogue/weights/domain-impact-weights.json` | 630 wag `W(d,ic)` |
| `catalogue/weights/impact-criterion-weights.json` | 14 wag `W_f(ic)` |
| `catalogue/class-bands.json`, `key-functionalities.json` | Klasy A–G, 3 kluczowe funkcjonalności |
| `supabase/migrations/096_sri_catalogue.sql` | Schemat `sri_*` + `sri_source_imports` + seed słowników + rekord importu |
| `supabase/seed/096_sri_catalogue_seed.sql` | Masowy seed katalogu (regenerowalny z JSON) |
| `store/sri/_extract.py`, `_build_catalogue.py`, `_gen_seed_sql.py` | Pipeline: Excel → raw JSON → katalog → seed SQL |

---

## 4. Mechanizm aktualizowalności (proweniencja)

Tabela `sri_source_imports` + `import-manifest.json` przechowują dla każdego importu:

- **source_version** — np. `SRI calculation sheet v4.5`
- **import_date** — data importu
- **import_hash** — SHA-256 pliku Excel (wykrywa zmianę pliku źródłowego)
- **source_checksum** — SHA-256 znormalizowanego zbioru danych (wykrywa realną zmianę *danych*, niezależnie od metadanych pliku)
- **importer_version** — wersja skryptu ekstrahującego (`1.0.0`)
- **record_counts** — liczniki do szybkiego diffu wersji

**Procedura aktualizacji do SRI v5.0** (za 2–3 lata):
1. Wrzucić nowy `SRI_calculation-sheet_v5.0.xlsx` do `store/sri/`.
2. Zaktualizować `SOURCE_VERSION`/`IMPORTER_VERSION` w `_build_catalogue.py`, uruchomić `_extract.py` → `_build_catalogue.py` → `_gen_seed_sql.py` z nowym `CATALOGUE_CODE` (np. `eu-method-b-2020-v5.0`).
3. Nowy katalog wstawia się obok starego (stary zostaje do porównań). Porównać `record_counts` i `source_checksum` starego vs nowego.
4. Przełączyć aktywny katalog w aplikacji.

Aktualne hashe v4.5 (w `import-manifest.json`):
- Excel: `255e1e69…62da5` (660 869 B)
- Dane: `fea84a19…95a4`

---

## 5. Kolejność uruchomienia w Supabase

1. `supabase/migrations/096_sri_catalogue.sql` (struktura + słowniki + rekord importu)
2. `supabase/seed/096_sri_catalogue_seed.sql` (54 usługi + FL + scores + wagi)

Oba idempotentne. Pliki źródłowe KE (`*.xlsx`, `*.pdf`, `raw/`) są w `.gitignore` (T&C KE zabraniają redystrybucji — tożsamość weryfikuje się hashem).

---

## 6. Następne kroki (poza tym zadaniem)

- Silnik obliczeniowy SRI (I → D → SR) korzystający z tabel `sri_*`.
- Pytania audytowe generowane z poziomów funkcjonalności.
- Opcjonalnie: katalog krajowy PL (Annex VI) jako `catalogue: pl-national`.
