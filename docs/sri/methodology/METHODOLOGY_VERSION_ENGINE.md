# SRI Methodology Version Engine

> Wygenerowane automatycznie przez `store/sri/methodology/methodology_engine.py`. Nie edytowac recznie.

Warstwa wersjonowania metodologii SRI. Pozwala utrzymywac wiele wersji metodologii (UE, krajowe, wlasne) obok siebie, dziedziczyc je i porownywac, bez zmiany kodu silnika liczacego.

## 1. Zasada dzialania (data-driven)

Dodanie nowej wersji metodologii = **wpis w rejestrze + opcjonalny overlay**. Silnik nie wymaga modyfikacji.

```
MethodologyVersion (metadane + inherits_from + overlay)
        |  materializacja (lancuch dziedziczenia + overlaye)
        v
   Pelna tresc metodologii (services, FL, wagi, impact scores,
   calculation_strategy, audit_questions, recommendations, reports)
        |  diff(base, compared)
        v
   MethodologyDiff[] (change_type, entity_type, impact_level,
                      requires_manual_review)
```

Wersja bazowa (root) `eu-sri-v4.5` ma `inherits_from = null` i laduje pelna tresc z oficjalnego katalogu `docs/sri/catalogue/`. Kazda kolejna wersja nadpisuje tylko to, co zmienia (overlay), reszte dziedziczy.

## 2. Encja MethodologyVersion

| Pole | Opis |
|---|---|
| `id` | unikalny identyfikator wersji (np. `pl-sri-v1.0`) |
| `methodology_type` | typ metodologii (SRI, EPBD, EN ISO 52120, custom) |
| `name` | nazwa czytelna |
| `country` | kraj / obszar (EU, PL, ...) |
| `version` | numer wersji w ramach typu/kraju |
| `valid_from / valid_to` | okres obowiazywania (valid_to=null = aktualna) |
| `status` | draft / active / deprecated / archived |
| `calculation_strategy` | id strategii liczenia (patrz CALCULATION_STRATEGY_MODEL.md) |
| `source_document` | nazwa/opis dokumentu zrodlowego |
| `source_checksum` | hash pliku(ow) zrodlowych (kontrola integralnosci) |
| `import_date` | data importu |
| `importer_version` | wersja importera (do reprodukowalnosci) |
| `inherits_from` | id wersji, z ktorej dziedziczy (null dla root) |
| `migration_notes` | notatki migracyjne / co sie zmienilo i dlaczego |

Poza kolumnami DB wersja niesie warstwe **overlay** (dane silnika), opisujaca roznice wzgledem wersji dziedziczonej: `weights_domain`, `weights_criterion`, `impact_scores`, `services` (add/remove/modify), `audit_questions` (add/remove), `calculation_strategy`, `recommendations`, `reports` oraz `source_type_default` (`official_methodology` | `engineering_assumption`).

## 3. Zarejestrowane wersje

| id | kraj | wersja | status | strategia | dziedziczy z | uslugi | pyt. audytowe |
|---|---|---|---|---|---|---|---|
| `eu-sri-v4.5` | EU | 4.5 | active | `iso52120_weighted_renormalized` | - | 54 | 0 |
| `pl-sri-v1.0` | PL | 1.0 | draft | `iso52120_weighted_renormalized` | eu-sri-v4.5 | 54 | 0 |
| `pl-sri-v1.1` | PL | 1.1 | draft | `iso52120_weighted_renormalized` | eu-sri-v4.5 | 54 | 3 |
| `pl-sri-v2.0` | PL | 2.0 | draft | `pl_capped_weighted` | pl-sri-v1.1 | 54 | 3 |
| `eu-sri-v5.0` | EU | 5.0 | draft | `iso52120_weighted_renormalized` | eu-sri-v4.5 | 55 | 0 |

### Provenance wersji bazowej

- `source_checksum` (root): `fea84a1931abb38c78e6ede524120c9c3527d8330407cbe5ff10e74f06ef95a4`
- `import_date`: 2026-07-08, `importer_version`: 1.0.0
- `content_checksum` (root): `98244fda28a80b62ef0be745d505c027874212ca5fc9e52297317d0c31e91f9a`

## 4. Dziedziczenie

Materializacja wersji rekurencyjnie stosuje overlaye wzdluz lancucha `inherits_from`. Przyklad lancucha ze scenariusza 3:

```
eu-sri-v4.5 (root, katalog KE)
  -> pl-sri-v1.1 (dodaje pytania audytowe)
      -> pl-sri-v2.0 (zmienia calculation_strategy)
```

Dzieki temu `pl-sri-v2.0` dziedziczy wagi i impact scores z UE, pytania z PL v1.1, a zmienia wylacznie strategie liczenia.

## 5. Wykrywanie zmian

Silnik porownuje zmaterializowana tresc dwoch wersji w 8 obszarach: **uslugi, Functionality Levels, wagi (domen i kryteriow), impact scores, calculation strategy, pytania audytowe, rekomendacje, raporty**. Szczegoly klasyfikacji w `METHODOLOGY_DIFF_MODEL.md`.

## 6. Kontrola integralnosci

- `source_checksum` - hash plikow zrodlowych (czy zrodlo sie nie zmienilo).
- `content_checksum` - sha256 znormalizowanej tresci zmaterializowanej wersji (czy dwie wersje sa identyczne obliczeniowo mimo roznych metadanych).

Wersje o identycznym `content_checksum` daja identyczny wynik SRI (np. wersja dodajaca tylko pytania audytowe).

## 7. Artefakty

- `METHODOLOGY_REGISTRY.json` - rejestr wersji + strategie + statystyki + checksumy
- `METHODOLOGY_DIFFS.json` - pelne rekordy MethodologyDiff dla par testowych
- `METHODOLOGY_DIFF_MODEL.md` - model diffow
- `CALCULATION_STRATEGY_MODEL.md` - katalog strategii liczenia
- `VERSIONING_TEST_CASES.md` - scenariusze testowe i wyniki
