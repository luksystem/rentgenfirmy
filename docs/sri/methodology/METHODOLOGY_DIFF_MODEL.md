# SRI Methodology Diff Model

> Wygenerowane automatycznie. Nie edytowac recznie.

Model porownywania dwoch wersji metodologii. Wynik porownania to lista rekordow **MethodologyDiff**.

## 1. Encja MethodologyDiff

| Pole | Opis |
|---|---|
| `id` | deterministyczny UUID (uuid5 z base|compared|entity|change) |
| `base_version_id` | wersja bazowa porownania |
| `compared_version_id` | wersja porownywana |
| `change_type` | added / removed / modified |
| `entity_type` | service / functionality_level / weight_domain / weight_criterion / impact_score / calculation_strategy / audit_question / recommendation / report |
| `entity_id` | identyfikator zmienionego elementu (np. `H-1a|L4|energy_efficiency`) |
| `old_value` | wartosc w wersji bazowej (null dla added) |
| `new_value` | wartosc w wersji porownywanej (null dla removed) |
| `impact_level` | high / medium / low - wplyw na wynik SRI |
| `requires_manual_review` | czy zmiana wymaga recznej weryfikacji przed publikacja |
| `source_type` | official_methodology / engineering_assumption |

## 2. Reguly impact_level i requires_manual_review

| entity_type | impact_level | manual review | uzasadnienie |
|---|---|---|---|
| calculation_strategy | high | tak | zmienia sposob liczenia wyniku |
| service | high | tak | zmienia zakres punktowanych uslug |
| functionality_level | high | tak | zmienia dostepne poziomy / maxposs |
| impact_score | high | tak | bezposrednio zmienia punktacje |
| weight_domain | medium* | tak | wplyw na wynik; *high gdy zmiana wzgl. > 20% |
| weight_criterion | medium* | tak | j.w. |
| audit_question | low | nie | nie wplywa na wynik liczbowy |
| recommendation | low | nie | warstwa doradcza |
| report | low | nie | warstwa prezentacji |

Zasada: **kazda zmiana wplywajaca na wynik liczbowy SRI** (uslugi, FL, wagi, impact scores, calculation strategy) automatycznie `requires_manual_review = true`. Zmiany warstwy audytu/rekomendacji/raportow nie blokuja publikacji.

## 3. Podsumowanie diffow (pary testowe)

| Scenariusz | base -> compared | zmiany | do weryfikacji | wg wagi |
|---|---|---|---|---|
| S1 - PL v1.0 zmienia tylko wagi | `eu-sri-v4.5` -> `pl-sri-v1.0` | 3 | 3 | high:1, medium:2 |
| S2 - PL v1.1 dodaje pytania audytowe (bez zmian liczenia) | `eu-sri-v4.5` -> `pl-sri-v1.1` | 4 | 0 | low:4 |
| S3 - PL v2.0 zmienia calculation_strategy | `pl-sri-v1.1` -> `pl-sri-v2.0` | 1 | 1 | high:1 |
| S4 - EU v5.0 zmienia uslugi i impact scores | `eu-sri-v4.5` -> `eu-sri-v5.0` | 3 | 3 | high:3 |
| S5 - porownanie EU v4.5 vs PL v2.0 (pelny zakres roznic) | `eu-sri-v4.5` -> `pl-sri-v2.0` | 5 | 1 | high:1, low:4 |
