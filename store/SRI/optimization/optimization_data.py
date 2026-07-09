# -*- coding: utf-8 -*-
"""SRI Optimization Engine — dane etapowania.

Warstwa POMOCNICZA nad rekomendacjami. NIE zmienia punktacji SRI.
Definiuje 5 etapow modernizacji, przypisanie capability -> etap, model ryzyka
oraz reguly grupowania (pakowania) rekomendacji. Bez UI/ofert/kosztow/ROI.
"""

# ─────────────────────────────────────────────────────────────────────────────
# 5 etapow modernizacji
# ─────────────────────────────────────────────────────────────────────────────
STAGES = [
    {"id": 1, "name": "Szybkie wygrane / niski prog wejscia",
     "description": "Konfiguracja i oprogramowanie bez nowego sprzetu: harmonogramy, centralna automatyka, "
                    "wizualizacja, historia, alarmy, zdalny dostep.",
     "entry_criteria": "brak inwestycji sprzetowej, niskie ryzyko, szybki efekt",
     "typical_risk": "low"},
    {"id": 2, "name": "Fundament techniczny",
     "description": "Czujniki, liczniki, komunikacja cyfrowa i integracja z BMS oraz sterowanie strefowe. "
                    "Warstwa danych, ktora odblokowuje wyzsze poziomy w wielu uslugach.",
     "entry_criteria": "montaz czujnikow/licznikow/magistrali; fundament pod dalsze etapy",
     "typical_risk": "low-medium"},
    {"id": 3, "name": "Zaawansowana automatyka",
     "description": "Sterowanie wg zapotrzebowania, napedy o zmiennej predkosci, modulacja zrodel, kaskady, "
                    "odzysk/free-cooling, sterowanie oslonami, wykrywanie usterek (FDD).",
     "entry_criteria": "wymaga fundamentu z etapu 2 (dane + integracja)",
     "typical_risk": "medium"},
    {"id": 4, "name": "Elastycznosc energetyczna / PV / magazyn / EV",
     "description": "Reakcja na sygnaly sieci/taryf, PV, magazyny ciepla/energii, autokonsumpcja, "
                    "pomiar dwukierunkowy, ladowanie EV, mikrosiec.",
     "entry_criteria": "inwestycje kapitalowe i prace elektryczne; wysoki potencjal elastycznosci",
     "typical_risk": "high"},
    {"id": 5, "name": "Predykcja, AI, optymalizacja",
     "description": "Sterowanie predykcyjne i optymalizacja z wyprzedzeniem (pogoda, oblozenie, ceny). "
                    "Szczyt dojrzalosci — wymaga danych i dojrzalej automatyki.",
     "entry_criteria": "wymaga danych historycznych i dzialajacej automatyki z etapow 2-4",
     "typical_risk": "medium"},
]

# ─────────────────────────────────────────────────────────────────────────────
# Przypisanie capability -> etap
# Zasada: usluga awansuje do poziomu FL, dla ktorego WSZYSTKIE wymagane capability
# naleza do etapow <= k. Etap capability = najwczesniejszy etap, w ktorym mozna ja wdrozyc.
# ─────────────────────────────────────────────────────────────────────────────
STAGE_BY_CAPABILITY = {
    # Etap 1 — konfiguracja / software
    "scheduling": 1,
    "central_automatic_control": 1,
    "reporting_platform": 1,
    "data_logging": 1,
    "alarms": 1,
    "remote_access": 1,
    "temperature_measurement": 1,  # podstawowy czujnik wbudowany w termostat/sterownik — niski prog
    # Etap 2 — czujniki / liczniki / komunikacja / BMS / strefy
    "occupancy_detection": 2,
    "co2_measurement": 2,
    "humidity_measurement": 2,
    "daylight_measurement": 2,
    "weather_data": 2,
    "energy_metering": 2,
    "submetering": 2,
    "pv_monitoring": 2,
    "digital_communication": 2,
    "bms_integration": 2,
    "zonal_control": 2,
    "automated_switching_actuation": 2,
    "dimmable_lighting": 2,
    "actuator_feedback": 2,
    "window_contact": 2,
    # Etap 3 — zaawansowana automatyka
    "demand_based_control": 3,
    "variable_speed_drive": 3,
    "modulating_generator": 3,
    "sequencing_controller": 3,
    "interlock_control": 3,
    "heat_recovery_control": 3,
    "free_cooling": 3,
    "shading_actuation": 3,
    "sun_position_tracking": 3,
    "window_actuation": 3,
    "fault_detection": 3,
    # Etap 4 — elastycznosc / PV / magazyn / EV
    "grid_signal_interface": 4,
    "electrical_storage": 4,
    "local_generation": 4,
    "solar_thermal_collector": 4,
    "self_consumption_optimization": 4,
    "bidirectional_metering": 4,
    "thermal_storage": 4,
    "ev_charging_point": 4,
    "load_balancing": 4,
    "charging_connectivity": 4,
    "microgrid_controller": 4,
    "dsm_override": 4,
    # Etap 5 — predykcja / AI / optymalizacja
    "predictive_control": 5,
}

RISK_ORDER = {"low": 0, "medium": 1, "high": 2}


def capability_risk(cap_id, needs_manual, stage):
    """Ryzyko wdrozenia pojedynczej capability."""
    if needs_manual:            # obecnosc fizyczna urzadzenia -> inwestycja/prace
        return "high"
    if stage >= 3:              # zaawansowana automatyka / AI -> strojenie, dane
        return "medium"
    return "low"                # konfiguracja / integracja programowa


# ─────────────────────────────────────────────────────────────────────────────
# Reguly grupowania (pakowania) rekomendacji w jeden etap wykonawczy
# ─────────────────────────────────────────────────────────────────────────────
PACKAGING_RULES = [
    {"id": "P1_same_stage_domain",
     "description": "Rekomendacje w tym samym etapie i tej samej domenie -> jeden pakiet wykonawczy.",
     "condition": "stage == stage AND domain == domain"},
    {"id": "P2_shared_foundation",
     "description": "Rekomendacje wspoldzielace fundamentalna funkcje (bms_integration, digital_communication, "
                    "energy_metering) -> wspolne uruchomienie/commissioning.",
     "condition": "shared_capability in {bms_integration, digital_communication, energy_metering}"},
    {"id": "P3_shared_sensor_install",
     "description": "Rekomendacje wymagajace tej samej instalacji czujnikow (occupancy, co2, temperature) "
                    "-> wspolny montaz dla HVAC/wentylacji/oswietlenia.",
     "condition": "shared_capability in {occupancy_detection, co2_measurement, temperature_measurement}"},
    {"id": "P4_cross_domain_once",
     "description": "Funkcje cross-domain (occupancy, weather, energy_metering, grid_signal) wdraza sie RAZ "
                    "dla wszystkich domen, ktore z nich korzystaja.",
     "condition": "capability.cross_domain == true"},
    {"id": "P5_capital_bundle",
     "description": "Inwestycje kapitalowe etapu 4 (PV + magazyn + EV + pomiar dwukierunkowy) laczy sie "
                    "w jeden pakiet elektryczny/elastycznosciowy.",
     "condition": "stage == 4 AND capability in flexibility_set"},
]
