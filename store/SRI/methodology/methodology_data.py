# -*- coding: utf-8 -*-
"""
Methodology Version Engine - warstwa danych (data-driven).

Zasada: nowa wersja metodologii = wpis w REJESTRZE + opcjonalny OVERLAY.
Silnik (methodology_engine.py) NIE wymaga zmian, aby dodac nowa wersje.

Encje:
  - MethodologyVersion  -> VERSIONS
  - CalculationStrategy -> CALCULATION_STRATEGIES
  - MethodologyDiff     -> generowany przez silnik (nie definiowany tutaj)

Overlay opisuje ZMIANY wzgledem wersji dziedziczonej (inherits_from).
Wersja bazowa (root, inherits_from=None, overlay=None) laduje pelna tresc
z oficjalnego katalogu docs/sri/catalogue/.

Provenance zmian: kazda zmiana ma source_type na poziomie silnika:
  - official_methodology  (zmiana wynika z oficjalnego zrodla / arkusza KE)
  - engineering_assumption (zalozenie inzynierskie / lokalna adaptacja)
Overlay moze nadpisac ten typ per grupa zmian (patrz pole "source_type").
"""

# ---------------------------------------------------------------------------
# CalculationStrategy - katalog strategii liczenia (pluggable po id)
# ---------------------------------------------------------------------------
# algorithm_type wskazuje implementacje w warstwie silnika liczacego (sri_engine).
# Dodanie nowej strategii = wpis tutaj + (jesli nowy algorithm_type) implementacja
# w rejestrze algorytmow. Wersje metodologii wskazuja strategie po "id".

CALCULATION_STRATEGIES = [
    {
        "id": "iso52120_weighted_renormalized",
        "name": "SRI EU Method B (renormalizacja wag domen)",
        "description": (
            "Oficjalna metoda obliczania SRI wg Delegated Reg. (EU) 2020/2155. "
            "Dla kazdego impact criterion sumuje achieved/maxposs po uslugach, "
            "wazy udzialem domen, renormalizuje wagi tylko dla domen obecnych "
            "w budynku, a nastepnie agreguje po kryteriach do 3 kluczowych "
            "funkcjonalnosci i wyniku calkowitego."
        ),
        "algorithm_type": "weighted_domain_renormalized_aggregation",
        "supported_methodologies": ["SRI"],
        "config_schema": {
            "renormalize_domain_weights": {"type": "bool", "default": True},
            "aggregation": {"type": "enum", "values": ["weighted_sum"], "default": "weighted_sum"},
            "impact_criteria_count": {"type": "int", "default": 7},
            "key_functionalities_count": {"type": "int", "default": 3},
            "score_ratio": {"type": "enum", "values": ["achieved_over_maxposs"], "default": "achieved_over_maxposs"},
            "cap_percent": {"type": "float|null", "default": None},
        },
    },
    {
        "id": "iso52120_weighted_no_renorm",
        "name": "SRI wazony bez renormalizacji domen",
        "description": (
            "Wariant referencyjny: wagi domen stosowane wprost, bez renormalizacji "
            "do domen obecnych. Uzywany do porownan i testow regresji."
        ),
        "algorithm_type": "weighted_domain_aggregation",
        "supported_methodologies": ["SRI", "EN ISO 52120"],
        "config_schema": {
            "renormalize_domain_weights": {"type": "bool", "default": False},
            "aggregation": {"type": "enum", "values": ["weighted_sum"], "default": "weighted_sum"},
            "impact_criteria_count": {"type": "int", "default": 7},
            "cap_percent": {"type": "float|null", "default": None},
        },
    },
    {
        "id": "pl_capped_weighted",
        "name": "SRI Polska - wazony z limitem klasy",
        "description": (
            "Adaptacja krajowa: jak metoda B (z renormalizacja), ale wynik calkowity "
            "jest ograniczony gornym pulapem (cap_percent), dopoki nie zostana spelnione "
            "minimalne wymagania monitoringu energii. Zalozenie inzynierskie / krajowe."
        ),
        "algorithm_type": "weighted_domain_renormalized_with_cap",
        "supported_methodologies": ["SRI"],
        "config_schema": {
            "renormalize_domain_weights": {"type": "bool", "default": True},
            "aggregation": {"type": "enum", "values": ["weighted_sum"], "default": "weighted_sum"},
            "impact_criteria_count": {"type": "int", "default": 7},
            "cap_percent": {"type": "float", "default": 95.0},
            "cap_release_capability": {"type": "string", "default": "energy_metering"},
        },
    },
]


# ---------------------------------------------------------------------------
# MethodologyVersion - rejestr wersji metodologii
# ---------------------------------------------------------------------------
# Pola zgodne ze specyfikacja encji MethodologyVersion.
# "overlay" to warstwa danych silnika (nie kolumna DB) opisujaca ROZNICE
# wzgledem wersji dziedziczonej. Root ma overlay=None (laduje katalog).
#
# Struktura overlay (wszystkie klucze opcjonalne):
#   weights_domain:    [ {building_type, climate_zone, domain, impact_criterion, new_weight} ]
#   weights_criterion: [ {building_type, impact_criterion, new_weight} ]
#   impact_scores:     [ {service, level, impact_criterion, new_score} ]
#   services:
#       add:    [ {code, domain, fl_max, name} ]
#       remove: [ code, ... ]
#       modify: [ {code, field, new_value} ]   # np. field="fl_max"
#   audit_questions:
#       add:    [ {id, topic, note} ]
#       remove: [ id, ... ]
#   calculation_strategy: "<strategy_id>"
#   recommendations:  { "version": "...", ...dowolne pola konfiguracji... }
#   reports:          { "version": "...", "set": [...] }
#   source_type_default: "official_methodology" | "engineering_assumption"

VERSIONS = [
    # --- ROOT: oficjalna wersja UE (ladowana z katalogu) --------------------
    {
        "id": "eu-sri-v4.5",
        "methodology_type": "SRI",
        "name": "SRI EU - arkusz obliczeniowy v4.5",
        "country": "EU",
        "version": "4.5",
        "valid_from": "2020-10-14",
        "valid_to": None,
        "status": "active",
        "calculation_strategy": "iso52120_weighted_renormalized",
        "source_document": "SRI calculation sheet v4.5",
        "source_checksum": None,  # uzupelniane z import-manifest.json przez silnik
        "import_date": None,      # j.w.
        "importer_version": None, # j.w.
        "inherits_from": None,
        "migration_notes": "Wersja bazowa. Import bezposrednio z oficjalnego arkusza KE (Method B).",
        "overlay": None,
    },

    # --- Scenariusz 1: PL v1.0 dziedziczy z EU v4.5, zmienia TYLKO wagi ------
    {
        "id": "pl-sri-v1.0",
        "methodology_type": "SRI",
        "name": "SRI Polska v1.0 (adaptacja wag krajowych)",
        "country": "PL",
        "version": "1.0",
        "valid_from": "2026-01-01",
        "valid_to": None,
        "status": "draft",
        "calculation_strategy": "iso52120_weighted_renormalized",
        "source_document": "Adaptacja krajowa PL - zalacznik wag (projekt)",
        "source_checksum": "pl-v1.0-weights-draft",
        "import_date": "2026-07-08",
        "importer_version": "1.0.0",
        "inherits_from": "eu-sri-v4.5",
        "migration_notes": (
            "Zmieniono wagi domen/kryteriow dla strefy north_east_europe (klimat PL). "
            "Calculation strategy, uslugi, FL i impact scores bez zmian."
        ),
        "overlay": {
            "source_type_default": "engineering_assumption",
            "weights_domain": [
                {"building_type": "non_residential", "climate_zone": "north_east_europe",
                 "domain": "heating", "impact_criterion": "energy_efficiency", "new_weight": 0.35},
                {"building_type": "non_residential", "climate_zone": "north_east_europe",
                 "domain": "cooling", "impact_criterion": "energy_efficiency", "new_weight": 0.06},
            ],
            "weights_criterion": [
                {"building_type": "non_residential",
                 "impact_criterion": "energy_efficiency", "new_weight": 0.20},
            ],
        },
    },

    # --- Scenariusz 2: PL v1.1 dodaje pytania audytowe, NIE zmienia liczenia -
    {
        "id": "pl-sri-v1.1",
        "methodology_type": "SRI",
        "name": "SRI Polska v1.1 (dodatkowe pytania audytowe)",
        "country": "PL",
        "version": "1.1",
        "valid_from": "2026-03-01",
        "valid_to": None,
        "status": "draft",
        "calculation_strategy": "iso52120_weighted_renormalized",
        "source_document": "Adaptacja krajowa PL - zestaw pytan audytowych (projekt)",
        "source_checksum": "pl-v1.1-questions-draft",
        "import_date": "2026-07-08",
        "importer_version": "1.0.0",
        "inherits_from": "eu-sri-v4.5",
        "migration_notes": (
            "Dodano krajowe pytania audytowe (warstwa zbioru danych, bez tresci audytu). "
            "Wagi, uslugi, impact scores i calculation strategy identyczne jak EU v4.5. "
            "Wynik liczbowy SRI niezmieniony."
        ),
        "overlay": {
            "source_type_default": "engineering_assumption",
            "audit_questions": {
                "add": [
                    {"id": "PL-AQ-001", "topic": "heating", "note": "Weryfikacja licznika ciepla (placeholder)"},
                    {"id": "PL-AQ-002", "topic": "electricity", "note": "Weryfikacja licznika energii (placeholder)"},
                    {"id": "PL-AQ-003", "topic": "monitoring", "note": "Dostep do danych BMS (placeholder)"},
                ]
            },
            "reports": {"version": "1.1-pl", "set": ["SRI_REPORT_PL"]},
        },
    },

    # --- Scenariusz 3: PL v2.0 zmienia calculation_strategy -----------------
    {
        "id": "pl-sri-v2.0",
        "methodology_type": "SRI",
        "name": "SRI Polska v2.0 (nowa strategia liczenia)",
        "country": "PL",
        "version": "2.0",
        "valid_from": "2027-01-01",
        "valid_to": None,
        "status": "draft",
        "calculation_strategy": "pl_capped_weighted",
        "source_document": "Adaptacja krajowa PL - metoda z limitem klasy (projekt)",
        "source_checksum": "pl-v2.0-strategy-draft",
        "import_date": "2026-07-08",
        "importer_version": "1.0.0",
        "inherits_from": "pl-sri-v1.1",
        "migration_notes": (
            "Dziedziczy z PL v1.1 (pytania audytowe). Zmieniono calculation_strategy na "
            "pl_capped_weighted (limit klasy do czasu wdrozenia monitoringu energii). "
            "ZMIANA WYMAGA RECZNEJ WERYFIKACJI - wplyw na wynik i klasyfikacje."
        ),
        "overlay": {
            "source_type_default": "engineering_assumption",
            "calculation_strategy": "pl_capped_weighted",
        },
    },

    # --- Scenariusz 4: nowa wersja UE zmienia uslugi + impact scores --------
    {
        "id": "eu-sri-v5.0",
        "methodology_type": "SRI",
        "name": "SRI EU v5.0 (hipotetyczna aktualizacja KE)",
        "country": "EU",
        "version": "5.0",
        "valid_from": "2028-01-01",
        "valid_to": None,
        "status": "draft",
        "calculation_strategy": "iso52120_weighted_renormalized",
        "source_document": "SRI calculation sheet v5.0 (hipotetyczny)",
        "source_checksum": "eu-v5.0-hypothetical",
        "import_date": "2026-07-08",
        "importer_version": "1.0.0",
        "inherits_from": "eu-sri-v4.5",
        "migration_notes": (
            "Hipotetyczna aktualizacja KE: dodano nowa usluge sterowania odpowiedzia "
            "popytowa ogrzewania, podniesiono fl_max jednej uslugi wentylacji, "
            "skorygowano wybrane impact scores. Wszystkie zmiany oficjalne."
        ),
        "overlay": {
            "source_type_default": "official_methodology",
            "services": {
                "add": [
                    {"code": "H-DR1", "domain": "heating", "fl_max": 3,
                     "name": "Heating demand response control"},
                ],
                "modify": [
                    {"code": "V-4", "field": "fl_max", "new_value": 4},
                ],
            },
            "impact_scores": [
                {"service": "H-1a", "level": 4, "impact_criterion": "energy_efficiency", "new_score": 4},
                {"service": "H-1a", "level": 3, "impact_criterion": "energy_flexibility_and_storage", "new_score": 1},
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# Pary do porownania (MethodologyDiff) uruchamiane w testach
# ---------------------------------------------------------------------------
DIFF_PAIRS = [
    {"base": "eu-sri-v4.5", "compared": "pl-sri-v1.0",
     "scenario": "S1 - PL v1.0 zmienia tylko wagi"},
    {"base": "eu-sri-v4.5", "compared": "pl-sri-v1.1",
     "scenario": "S2 - PL v1.1 dodaje pytania audytowe (bez zmian liczenia)"},
    {"base": "pl-sri-v1.1", "compared": "pl-sri-v2.0",
     "scenario": "S3 - PL v2.0 zmienia calculation_strategy"},
    {"base": "eu-sri-v4.5", "compared": "eu-sri-v5.0",
     "scenario": "S4 - EU v5.0 zmienia uslugi i impact scores"},
    {"base": "eu-sri-v4.5", "compared": "pl-sri-v2.0",
     "scenario": "S5 - porownanie EU v4.5 vs PL v2.0 (pelny zakres roznic)"},
]
