# SRI — Handoff na następną sesję

> **✅ IMPORT ZAKOŃCZONY (2026-07-08).** Oficjalny arkusz KE `SRI calculation sheet v4.5`
> został zaimportowany, zwalidowany i zapisany jako katalog + migracja + seed.
> Bieżący status i pełny opis w `SRI-KNOWLEDGE-BASE-STATUS.md`.

## Co jest zrobione
- **Ekstrakcja + walidacja** danych z Excela v4.5: 54 usługi Method B, 27 Method A, 228 impact scores, 630 wag domen, 14 wag kryteriów. Testy spójności zdane.
- **Katalog JSON** w `docs/sri/catalogue/` (services-authoritative, impact-scores, weights/*, class-bands, key-functionalities).
- **Proweniencja** (`catalogue/import-manifest.json` + tabela `sri_source_imports`): source_version, import_date, import_hash (Excel), source_checksum (dane), importer_version, liczniki.
- **Migracja** `supabase/migrations/096_sri_catalogue.sql` (schemat + słowniki + rekord importu).
- **Seed** `supabase/seed/096_sri_catalogue_seed.sql` (masowe dane, regenerowalny z JSON).
- **Pipeline** w `store/sri/`: `_extract.py` → `_build_catalogue.py` → `_gen_seed_sql.py`.

## Pliki źródłowe KE
W `.gitignore` (`store/sri/*.xlsx`, `*.pdf`, `raw/`) — T&C KE zabraniają redystrybucji.
Tożsamość weryfikuje się hashami w `import-manifest.json`.

## Aktualizacja do przyszłej wersji (SRI v5.0)
Patrz `SRI-KNOWLEDGE-BASE-STATUS.md §4` — procedura krok po kroku (nowy `CATALOGUE_CODE`,
stary katalog zostaje do porównań, diff po `record_counts` i `source_checksum`).

## Następne kroki (nowa funkcjonalność, poza importem)
1. Silnik obliczeniowy SRI (I → D → SR) na tabelach `sri_*`.
2. Pytania audytowe generowane z poziomów funkcjonalności.
3. Opcjonalnie katalog krajowy PL (Annex VI) jako `catalogue: pl-national`.

## Pliki do przeczytania w pierwszej kolejności
- `SRI-KNOWLEDGE-BASE-STATUS.md` — stan ogólny, artefakty, mechanizm proweniencji.
- `IMPORT-MAPPING.md` — kontrakt mapowania Excel→DB.
- `DATABASE-SCHEMA.md` — DDL (odzwierciedlony w migracji 096).
