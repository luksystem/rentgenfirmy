# SRI Methodology Versioning - Test Cases

> Wygenerowane automatycznie. Nie edytowac recznie.

Scenariusze walidujace Version Engine i silnik diffow. Kazdy scenariusz materializuje wersje i porownuje je z baza.

## Scenariusz 1 - PL dziedziczy z EU v4.5 i zmienia tylko wagi

- **base:** `eu-sri-v4.5`  ->  **compared:** `pl-sri-v1.0`
- **dziedziczy z:** eu-sri-v4.5
- **calculation_strategy:** `iso52120_weighted_renormalized`
- **migration_notes:** Zmieniono wagi domen/kryteriow dla strefy north_east_europe (klimat PL). Calculation strategy, uslugi, FL i impact scores bez zmian.
- **wynik:** 3 zmian, do recznej weryfikacji: **3**
- **wg encji:** {'weight_domain': 2, 'weight_criterion': 1}

| change | entity_type | entity_id | old -> new | impact | manual |
|---|---|---|---|---|---|
| modified | weight_domain | `non_residential|north_east_europe|cooling|energy_efficiency` | 0.083878 -> 0.06 | high | TAK |
| modified | weight_domain | `non_residential|north_east_europe|heating|energy_efficiency` | 0.292478 -> 0.35 | medium | TAK |
| modified | weight_criterion | `non_residential|energy_efficiency` | 0.166667 -> 0.2 | medium | TAK |

**Weryfikacja:**
- [OK] zmiany dotycza wylacznie wag (entities=['weight_criterion', 'weight_domain'])
- [OK] zmiana wag wymaga recznej weryfikacji

## Scenariusz 2 - PL dodaje pytania audytowe, nie zmienia liczenia

- **base:** `eu-sri-v4.5`  ->  **compared:** `pl-sri-v1.1`
- **dziedziczy z:** eu-sri-v4.5
- **calculation_strategy:** `iso52120_weighted_renormalized`
- **migration_notes:** Dodano krajowe pytania audytowe (warstwa zbioru danych, bez tresci audytu). Wagi, uslugi, impact scores i calculation strategy identyczne jak EU v4.5. Wynik liczbowy SRI niezmieniony.
- **wynik:** 4 zmian, do recznej weryfikacji: **0**
- **wg encji:** {'audit_question': 3, 'report': 1}

| change | entity_type | entity_id | old -> new | impact | manual |
|---|---|---|---|---|---|
| added | audit_question | `PL-AQ-001` | - -> {"topic": "heating", "note": "Weryfikacja licznika ciepla... | low | nie |
| added | audit_question | `PL-AQ-002` | - -> {"topic": "electricity", "note": "Weryfikacja licznika en... | low | nie |
| added | audit_question | `PL-AQ-003` | - -> {"topic": "monitoring", "note": "Dostep do danych BMS (pl... | low | nie |
| modified | report | `reports` | 1.0 -> 1.1-pl | low | nie |

**Weryfikacja:**
- [OK] brak zmian wplywajacych na wynik (entities=['audit_question', 'report'])
- [OK] dodano pytania audytowe

## Scenariusz 3 - PL zmienia calculation_strategy

- **base:** `pl-sri-v1.1`  ->  **compared:** `pl-sri-v2.0`
- **dziedziczy z:** pl-sri-v1.1
- **calculation_strategy:** `pl_capped_weighted`
- **migration_notes:** Dziedziczy z PL v1.1 (pytania audytowe). Zmieniono calculation_strategy na pl_capped_weighted (limit klasy do czasu wdrozenia monitoringu energii). ZMIANA WYMAGA RECZNEJ WERYFIKACJI - wplyw na wynik i klasyfikacje.
- **wynik:** 1 zmian, do recznej weryfikacji: **1**
- **wg encji:** {'calculation_strategy': 1}

| change | entity_type | entity_id | old -> new | impact | manual |
|---|---|---|---|---|---|
| modified | calculation_strategy | `calculation_strategy` | iso52120_weighted_renormalized -> pl_capped_weighted | high | TAK |

**Weryfikacja:**
- [OK] zmieniono calculation_strategy
- [OK] zmiana strategii wymaga recznej weryfikacji

## Scenariusz 4 - nowa wersja UE zmienia uslugi i impact scores

- **base:** `eu-sri-v4.5`  ->  **compared:** `eu-sri-v5.0`
- **dziedziczy z:** eu-sri-v4.5
- **calculation_strategy:** `iso52120_weighted_renormalized`
- **migration_notes:** Hipotetyczna aktualizacja KE: dodano nowa usluge sterowania odpowiedzia popytowa ogrzewania, podniesiono fl_max jednej uslugi wentylacji, skorygowano wybrane impact scores. Wszystkie zmiany oficjalne.
- **wynik:** 3 zmian, do recznej weryfikacji: **3**
- **wg encji:** {'service': 1, 'impact_score': 2}

| change | entity_type | entity_id | old -> new | impact | manual |
|---|---|---|---|---|---|
| added | service | `H-DR1` | - -> {"domain": "heating", "fl_max": 3, "name": "Heating deman... | high | TAK |
| modified | impact_score | `H-1a|L3|energy_flexibility_and_storage` | 0.0 -> 1.0 | high | TAK |
| modified | impact_score | `H-1a|L4|energy_efficiency` | 3.0 -> 4.0 | high | TAK |

**Weryfikacja:**
- [OK] dodano/zmieniono uslugi
- [OK] zmieniono impact scores
- [OK] zmiany oficjalne wymagaja recznej weryfikacji

## Scenariusz 5 - porownanie EU v4.5 vs PL v2.0 (pelny zakres)

Kumulatywne porownanie przez caly lancuch dziedziczenia (wagi z v1.0? nie - v2.0 dziedziczy z v1.1, wiec wagi = EU; roznice to pytania audytowe + calculation strategy).

- **wynik:** 5 zmian, do recznej weryfikacji: **1**
- **wg encji:** {'calculation_strategy': 1, 'audit_question': 3, 'report': 1}

| change | entity_type | entity_id | old -> new | impact | manual |
|---|---|---|---|---|---|
| modified | calculation_strategy | `calculation_strategy` | iso52120_weighted_renormalized -> pl_capped_weighted | high | TAK |
| added | audit_question | `PL-AQ-001` | - -> {"topic": "heating", "note": "Weryfikacja licznika ciepla... | low | nie |
| added | audit_question | `PL-AQ-002` | - -> {"topic": "electricity", "note": "Weryfikacja licznika en... | low | nie |
| added | audit_question | `PL-AQ-003` | - -> {"topic": "monitoring", "note": "Dostep do danych BMS (pl... | low | nie |
| modified | report | `reports` | 1.0 -> 1.1-pl | low | nie |

**Elementy wymagajace recznej weryfikacji:**
- `calculation_strategy` / `calculation_strategy`: iso52120_weighted_renormalized -> pl_capped_weighted (high)

## Podsumowanie testow

| Scenariusz | zmiany | high | manual review | poprawnie? |
|---|---|---|---|---|
| S1 - PL v1.0 zmienia tylko wagi | 3 | 1 | 3 | OK |
| S2 - PL v1.1 dodaje pytania audytowe (bez zmian liczenia) | 4 | 0 | 0 | OK |
| S3 - PL v2.0 zmienia calculation_strategy | 1 | 1 | 1 | OK |
| S4 - EU v5.0 zmienia uslugi i impact scores | 3 | 3 | 3 | OK |
| S5 - porownanie EU v4.5 vs PL v2.0 (pelny zakres roznic) | 5 | 1 | 1 | OK |
