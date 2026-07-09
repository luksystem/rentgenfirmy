# SRI Calculation Strategy Model

> Wygenerowane automatycznie. Nie edytowac recznie.

Strategia liczenia jest **pluggable** - wersja metodologii wskazuje strategie po `id`. Silnik liczacy dobiera implementacje po `algorithm_type`. Dodanie nowej strategii nie wymaga zmian w Version Engine.

## Encja CalculationStrategy

| Pole | Opis |
|---|---|
| `id` | identyfikator strategii |
| `name` | nazwa czytelna |
| `description` | opis metody |
| `algorithm_type` | typ algorytmu -> implementacja w silniku liczacym |
| `supported_methodologies` | z jakimi typami metodologii wspolpracuje |
| `config_schema` | parametry strategii (schema + wartosci domyslne) |

## Katalog strategii

### `iso52120_weighted_renormalized`

- **Nazwa:** SRI EU Method B (renormalizacja wag domen)
- **algorithm_type:** `weighted_domain_renormalized_aggregation`
- **supported_methodologies:** SRI
- **Opis:** Oficjalna metoda obliczania SRI wg Delegated Reg. (EU) 2020/2155. Dla kazdego impact criterion sumuje achieved/maxposs po uslugach, wazy udzialem domen, renormalizuje wagi tylko dla domen obecnych w budynku, a nastepnie agreguje po kryteriach do 3 kluczowych funkcjonalnosci i wyniku calkowitego.
- **config_schema:**

| parametr | typ | domyslnie |
|---|---|---|
| `renormalize_domain_weights` | bool | True |
| `aggregation` | enum | weighted_sum |
| `impact_criteria_count` | int | 7 |
| `key_functionalities_count` | int | 3 |
| `score_ratio` | enum | achieved_over_maxposs |
| `cap_percent` | float|null | - |

### `iso52120_weighted_no_renorm`

- **Nazwa:** SRI wazony bez renormalizacji domen
- **algorithm_type:** `weighted_domain_aggregation`
- **supported_methodologies:** SRI, EN ISO 52120
- **Opis:** Wariant referencyjny: wagi domen stosowane wprost, bez renormalizacji do domen obecnych. Uzywany do porownan i testow regresji.
- **config_schema:**

| parametr | typ | domyslnie |
|---|---|---|
| `renormalize_domain_weights` | bool | False |
| `aggregation` | enum | weighted_sum |
| `impact_criteria_count` | int | 7 |
| `cap_percent` | float|null | - |

### `pl_capped_weighted`

- **Nazwa:** SRI Polska - wazony z limitem klasy
- **algorithm_type:** `weighted_domain_renormalized_with_cap`
- **supported_methodologies:** SRI
- **Opis:** Adaptacja krajowa: jak metoda B (z renormalizacja), ale wynik calkowity jest ograniczony gornym pulapem (cap_percent), dopoki nie zostana spelnione minimalne wymagania monitoringu energii. Zalozenie inzynierskie / krajowe.
- **config_schema:**

| parametr | typ | domyslnie |
|---|---|---|
| `renormalize_domain_weights` | bool | True |
| `aggregation` | enum | weighted_sum |
| `impact_criteria_count` | int | 7 |
| `cap_percent` | float | 95.0 |
| `cap_release_capability` | string | energy_metering |

## Zasada rozszerzania

1. Nowa strategia = wpis w `CALCULATION_STRATEGIES` (metadane + config_schema).
2. Jesli `algorithm_type` jest nowy, dodaje sie jego implementacje w rejestrze algorytmow silnika liczacego (`sri_engine`).
3. Wersja metodologii wskazuje strategie w polu `calculation_strategy`.
4. Version Engine i diff dzialaja bez zmian.
