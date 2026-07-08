# SRI Dependency Model

> Warstwa **pomocnicza (advisory)** nad oficjalna metodologia SRI. Nie zmienia punktacji ani listy uslug. Sluzy do odpowiedzi: co jest wymagane, aby osiagnac dany Functionality Level, co blokuje wyzszy poziom oraz jakie dane zebrac w audycie.

- Wygenerowano: `2026-07-08T20:58:16.846988+00:00`
- Wersja silnika zaleznosci: `1.0.0`
- Zdefiniowanych capability: **46**
- Uslug SRI objetych modelem: **54 / 54**
- Przypisanych zaleznosci (capability→usluga): **249**
  - z metodologii (`official_methodology`): **180**
  - zalozenia inzynierskie (`engineering_assumption`): **69**
- Zaleznosci wymagajacych recznej weryfikacji (obecnosc fizyczna): **25**
- Zaleznosci weryfikowanych wspomaganie (dane + audytor): **177**

## Model danych

Kazda zaleznosc = powiazanie **capability → usluga** z polami:

- `min_level` — najnizszy Functionality Level, od ktorego capability jest wymagana,
- `source_type` — `official_methodology` (wynika z opisu FL) lub `engineering_assumption` (praktyczna zaleznosc techniczna),
- `needs_manual_verification` — czy potwierdzenie wymaga czlowieka (zdjecie/dokument/ogledziny).

**Regula prerekwizytow:** capability z `min_level = n` jest wymagana dla FL ≥ n (kumulatywnie).
**Regula blokady:** brak capability z `min_level = n` ogranicza usluge do maks. FL = n-1.

## Kategorie capability

### actuation

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `automated_switching_actuation` | Automatyczne zalaczanie/wylaczanie | 2 | 1 | assisted |
| `dimmable_lighting` | Oprawy scieramialne (dimming) | 1 | 1 | manual |
| `ev_charging_point` | Punkt ladowania EV | 1 | 1 | manual |
| `shading_actuation` | Napedy zacienienia/rolet | 1 | 1 | manual |
| `window_actuation` | Napedy okien/klap | 1 | 1 | manual |

### communication

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `bms_integration` | Integracja z BMS/BACS | 12 | 6 | assisted |
| `charging_connectivity` | Laczonosc ladowania (OCPP/backend) | 1 | 1 | assisted |
| `digital_communication` | Komunikacja cyfrowa sterownikow | 10 | 5 | assisted |
| `remote_access` | Zdalny dostep | 2 | 2 | assisted |

### control

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `central_automatic_control` | Centralne sterowanie automatyczne | 4 | 2 | assisted |
| `demand_based_control` | Sterowanie wg zapotrzebowania | 16 | 4 | assisted |
| `free_cooling` | Free-cooling | 3 | 2 | assisted |
| `heat_recovery_control` | Sterowanie odzyskiem ciepla (by-pass) | 1 | 1 | manual |
| `interlock_control` | Blokada/koordynacja trybow (interlock) | 1 | 1 | assisted |
| `modulating_generator` | Modulacja mocy zrodla | 4 | 3 | manual |
| `predictive_control` | Sterowanie predykcyjne / optymalizacja | 27 | 7 | assisted |
| `scheduling` | Harmonogramy czasowe | 9 | 6 | assisted |
| `sequencing_controller` | Sterownik kaskady/sekwencji zrodel | 3 | 3 | assisted |
| `sun_position_tracking` | Sledzenie pozycji slonca | 1 | 1 | assisted |
| `variable_speed_drive` | Naped o zmiennej predkosci (falownik) | 3 | 3 | manual |
| `zonal_control` | Sterowanie strefowe / indywidualne | 8 | 5 | assisted |

### flexibility

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `electrical_storage` | Magazyn energii elektrycznej | 3 | 1 | manual |
| `grid_signal_interface` | Interfejs sygnalow sieci/taryf | 19 | 6 | assisted |
| `load_balancing` | Zarzadzanie moca ladowania (load balancing) | 1 | 1 | assisted |
| `local_generation` | Lokalna generacja (PV/CHP) | 2 | 1 | manual |
| `microgrid_controller` | Kontroler mikrosieci / praca wyspowa | 1 | 1 | manual |
| `self_consumption_optimization` | Optymalizacja autokonsumpcji | 4 | 3 | assisted |
| `solar_thermal_collector` | Kolektory sloneczne (solar thermal) | 1 | 1 | manual |
| `thermal_storage` | Magazyn ciepla/chlodu (bufor/TES) | 6 | 3 | manual |

### metering

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `bidirectional_metering` | Pomiar dwukierunkowy | 6 | 5 | assisted |
| `energy_metering` | Pomiar energii/ciepla/chlodu | 8 | 5 | assisted |
| `pv_monitoring` | Monitoring produkcji PV/OZE | 1 | 1 | assisted |
| `submetering` | Podlicznikowanie (submetering) | 1 | 1 | assisted |

### reporting

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `actuator_feedback` | Informacja zwrotna z napedow | 1 | 1 | assisted |
| `alarms` | Alarmy i powiadomienia | 10 | 7 | automatic |
| `data_logging` | Rejestracja i historia danych (trendy) | 11 | 7 | automatic |
| `fault_detection` | Wykrywanie usterek (FDD) | 6 | 5 | assisted |
| `reporting_platform` | Platforma raportowania/wizualizacji | 13 | 8 | automatic |

### safety

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `dsm_override` | Nadrzedne sterowanie DSM (override) | 1 | 1 | assisted |

### sensing

| Capability | Nazwa | Uslug | Domen | Weryfikacja |
|---|---|---|---|---|
| `co2_measurement` | Pomiar CO2 / jakosci powietrza | 2 | 1 | assisted |
| `daylight_measurement` | Pomiar natezenia swiatla | 1 | 1 | assisted |
| `humidity_measurement` | Pomiar wilgotnosci | 2 | 2 | assisted |
| `occupancy_detection` | Detekcja obecnosci | 7 | 5 | assisted |
| `temperature_measurement` | Pomiar temperatury | 17 | 5 | assisted |
| `weather_data` | Dane pogodowe / prognoza | 13 | 6 | automatic |
| `window_contact` | Detekcja otwarcia okna | 1 | 1 | assisted |

## Zaleznosci per usluga

### Chlodzenie (`cooling`)

#### C-1a — Sterowanie emisją chłodu (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `central_automatic_control` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `zonal_control` | 2 | official_methodology | nie |
| `bms_integration` | 3 | official_methodology | nie |
| `digital_communication` | 3 | official_methodology | nie |
| `occupancy_detection` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: central_automatic_control, temperature_measurement; FL2: central_automatic_control, temperature_measurement, zonal_control; FL3: bms_integration, central_automatic_control, digital_communication, temperature_measurement, zonal_control; FL4: bms_integration, central_automatic_control, digital_communication, occupancy_detection, temperature_measurement, zonal_control

#### C-1b — Sterowanie emisją TABS (tryb chłodzenia) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `central_automatic_control` | 1 | official_methodology | nie |
| `humidity_measurement` | 1 | engineering_assumption | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `zonal_control` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |
| `weather_data` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: central_automatic_control, humidity_measurement, temperature_measurement; FL2: central_automatic_control, humidity_measurement, temperature_measurement, zonal_control; FL3: central_automatic_control, humidity_measurement, predictive_control, temperature_measurement, weather_data, zonal_control

#### C-1c — Sterowanie agregatem chłodu (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `weather_data` | 1 | official_methodology | nie |
| `demand_based_control` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: temperature_measurement, weather_data; FL2: demand_based_control, temperature_measurement, weather_data

#### C-1d — Sterowanie temperaturą wody chłodniczej w sieci (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `demand_based_control` | 1 | official_methodology | nie |
| `variable_speed_drive` | 2 | official_methodology | tak |
| `digital_communication` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: demand_based_control; FL2: demand_based_control, variable_speed_drive; FL3: demand_based_control, variable_speed_drive; FL4: demand_based_control, digital_communication, variable_speed_drive

#### C-1f — Sterowanie pompami w sieci chłodu (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `interlock_control` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `bms_integration` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: interlock_control, temperature_measurement; FL2: bms_integration, interlock_control, temperature_measurement

#### C-1g — Sterowanie magazynem energii cieplnej (chłodzenie) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `scheduling` | 1 | engineering_assumption | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `thermal_storage` | 1 | official_methodology | tak |
| `demand_based_control` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: scheduling, temperature_measurement, thermal_storage; FL2: demand_based_control, scheduling, temperature_measurement, thermal_storage; FL3: demand_based_control, grid_signal_interface, scheduling, temperature_measurement, thermal_storage

#### C-2a — Blokada jednoczesnego ogrzewania i chłodzenia w strefach (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `modulating_generator` | 1 | official_methodology | tak |
| `weather_data` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `free_cooling` | 3 | engineering_assumption | nie |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: modulating_generator, weather_data; FL2: demand_based_control, modulating_generator, weather_data; FL3: demand_based_control, free_cooling, modulating_generator, predictive_control, weather_data

#### C-2b — Sekwencjonowanie wielu źródeł chłodu (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `sequencing_controller` | 1 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: sequencing_controller; FL2: energy_metering, sequencing_controller; FL3: energy_metering, grid_signal_interface, sequencing_controller; FL4: energy_metering, grid_signal_interface, predictive_control, sequencing_controller

#### C-3 — Elastyczność sterowania chłodzeniem (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `fault_detection` | 3 | engineering_assumption | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: reporting_platform; FL2: data_logging, energy_metering, reporting_platform; FL3: alarms, data_logging, energy_metering, fault_detection, reporting_platform; FL4: alarms, data_logging, energy_metering, fault_detection, predictive_control, reporting_platform

#### C-4 — Raportowanie informacji o pracy chłodzenia (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | official_methodology | nie |
| `scheduling` | 1 | engineering_assumption | nie |
| `thermal_storage` | 2 | engineering_assumption | tak |
| `predictive_control` | 3 | official_methodology | nie |
| `bidirectional_metering` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface, scheduling; FL2: grid_signal_interface, scheduling, thermal_storage; FL3: grid_signal_interface, predictive_control, scheduling, thermal_storage; FL4: bidirectional_metering, grid_signal_interface, predictive_control, scheduling, thermal_storage

### Cieppla woda uzytkowa (`domestic_hot_water`)

#### DHW-1a — Sterowanie ładowaniem zasobnika CWU (grzałka lub wbudowana pompa) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `scheduling` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |
| `self_consumption_optimization` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: scheduling, temperature_measurement; FL2: demand_based_control, scheduling, temperature_measurement; FL3: demand_based_control, grid_signal_interface, scheduling, self_consumption_optimization, temperature_measurement

#### DHW-1b — Sterowanie ładowaniem zasobnika CWU (wytwarzanie ciepłej wody) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `scheduling` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: scheduling, temperature_measurement; FL2: demand_based_control, scheduling, temperature_measurement; FL3: demand_based_control, grid_signal_interface, scheduling, temperature_measurement

#### DHW-1d — Sterowanie ładowaniem CWU (kolektor słoneczny + źródło uzupełniające) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `solar_thermal_collector` | 1 | official_methodology | tak |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |
| `weather_data` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: solar_thermal_collector, temperature_measurement; FL2: demand_based_control, solar_thermal_collector, temperature_measurement; FL3: demand_based_control, predictive_control, solar_thermal_collector, temperature_measurement, weather_data

#### DHW-2b — Sekwencjonowanie wielu generatorów CWU (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `sequencing_controller` | 1 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: sequencing_controller; FL2: energy_metering, sequencing_controller; FL3: energy_metering, grid_signal_interface, sequencing_controller; FL4: energy_metering, grid_signal_interface, predictive_control, sequencing_controller

#### DHW-3 — Raportowanie informacji o pracy instalacji CWU (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `energy_metering` | 1 | engineering_assumption | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `fault_detection` | 3 | engineering_assumption | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: energy_metering, reporting_platform; FL2: data_logging, energy_metering, reporting_platform; FL3: alarms, data_logging, energy_metering, fault_detection, reporting_platform; FL4: alarms, data_logging, energy_metering, fault_detection, predictive_control, reporting_platform

### Dynamiczna obudowa budynku (`dynamic_building_envelope`)

#### DE-1 — Sterowanie osłonami przeciwsłonecznymi (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `shading_actuation` | 1 | official_methodology | tak |
| `weather_data` | 1 | official_methodology | nie |
| `temperature_measurement` | 2 | engineering_assumption | nie |
| `zonal_control` | 2 | engineering_assumption | nie |
| `sun_position_tracking` | 3 | official_methodology | nie |
| `bms_integration` | 4 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: shading_actuation, weather_data; FL2: shading_actuation, temperature_measurement, weather_data, zonal_control; FL3: shading_actuation, sun_position_tracking, temperature_measurement, weather_data, zonal_control; FL4: bms_integration, predictive_control, shading_actuation, sun_position_tracking, temperature_measurement, weather_data, zonal_control

#### DE-2 — Sterowanie otwieraniem okien z integracją HVAC (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `bms_integration` | 1 | engineering_assumption | nie |
| `window_contact` | 1 | official_methodology | nie |
| `window_actuation` | 2 | official_methodology | tak |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: bms_integration, window_contact; FL2: bms_integration, window_actuation, window_contact; FL3: bms_integration, predictive_control, window_actuation, window_contact

#### DE-4 — Raportowanie pracy dynamicznej powłoki budynku (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `actuator_feedback` | 1 | official_methodology | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `fault_detection` | 3 | engineering_assumption | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: actuator_feedback, reporting_platform; FL2: actuator_feedback, data_logging, reporting_platform; FL3: actuator_feedback, alarms, data_logging, fault_detection, reporting_platform; FL4: actuator_feedback, alarms, data_logging, fault_detection, predictive_control, reporting_platform

### Ladowanie pojazdow elektrycznych (`electric_vehicle_charging`)

#### EV-15 — Moce ładowania pojazdów elektrycznych (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `ev_charging_point` | 1 | official_methodology | tak |
| `scheduling` | 2 | official_methodology | nie |
| `load_balancing` | 3 | official_methodology | nie |
| `grid_signal_interface` | 4 | engineering_assumption | nie |
| `self_consumption_optimization` | 4 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: ev_charging_point; FL2: ev_charging_point, scheduling; FL3: ev_charging_point, load_balancing, scheduling; FL4: ev_charging_point, grid_signal_interface, load_balancing, scheduling, self_consumption_optimization

#### EV-16 — Harmonogramowe balansowanie obciążenia ładowania EV (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | official_methodology | nie |
| `bidirectional_metering` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface; FL2: bidirectional_metering, grid_signal_interface

#### EV-17 — Informacja o ładowaniu pojazdów elektrycznych (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `reporting_platform` | 1 | official_methodology | nie |
| `charging_connectivity` | 2 | official_methodology | nie |
| `remote_access` | 2 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: reporting_platform; FL2: charging_connectivity, remote_access, reporting_platform

### Elektrycznosc (`electricity`)

#### E-11 — Raportowanie stanu magazynów energii (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `electrical_storage` | 1 | engineering_assumption | tak |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: electrical_storage, reporting_platform; FL2: data_logging, electrical_storage, reporting_platform; FL3: alarms, data_logging, electrical_storage, reporting_platform; FL4: alarms, data_logging, electrical_storage, predictive_control, reporting_platform

#### E-12 — Wsparcie trybu pracy mikro-sieci (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `energy_metering` | 1 | official_methodology | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | engineering_assumption | nie |
| `submetering` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: energy_metering, reporting_platform; FL2: data_logging, energy_metering, reporting_platform; FL3: alarms, data_logging, energy_metering, reporting_platform, submetering; FL4: alarms, data_logging, energy_metering, predictive_control, reporting_platform, submetering

#### E-2 — Raportowanie lokalnej generacji energii (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `pv_monitoring` | 1 | official_methodology | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: pv_monitoring, reporting_platform; FL2: data_logging, pv_monitoring, reporting_platform; FL3: alarms, data_logging, pv_monitoring, reporting_platform; FL4: alarms, data_logging, predictive_control, pv_monitoring, reporting_platform

#### E-3 — Magazynowanie lokalnie wytworzonej energii (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `electrical_storage` | 1 | official_methodology | tak |
| `grid_signal_interface` | 2 | official_methodology | nie |
| `self_consumption_optimization` | 2 | engineering_assumption | nie |
| `bidirectional_metering` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: electrical_storage; FL2: electrical_storage, grid_signal_interface, self_consumption_optimization; FL3: bidirectional_metering, electrical_storage, grid_signal_interface, self_consumption_optimization; FL4: bidirectional_metering, electrical_storage, grid_signal_interface, predictive_control, self_consumption_optimization

#### E-4 — Raportowanie zużycia energii elektrycznej (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `local_generation` | 1 | engineering_assumption | tak |
| `self_consumption_optimization` | 1 | official_methodology | nie |
| `bms_integration` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: local_generation, self_consumption_optimization; FL2: bms_integration, local_generation, self_consumption_optimization; FL3: bms_integration, local_generation, predictive_control, self_consumption_optimization

#### E-5 — Optymalizacja autokonsumpcji energii (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `local_generation` | 1 | engineering_assumption | tak |
| `modulating_generator` | 1 | official_methodology | tak |
| `grid_signal_interface` | 2 | official_methodology | nie |
| `thermal_storage` | 2 | engineering_assumption | tak |

_Prerekwizyty:_ FL1: local_generation, modulating_generator; FL2: grid_signal_interface, local_generation, modulating_generator, thermal_storage

#### E-8 — Sterowanie kogeneracją (CHP) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | official_methodology | nie |
| `electrical_storage` | 2 | engineering_assumption | tak |
| `microgrid_controller` | 2 | official_methodology | tak |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface; FL2: electrical_storage, grid_signal_interface, microgrid_controller; FL3: electrical_storage, grid_signal_interface, microgrid_controller, predictive_control

### Ogrzewanie (`heating`)

#### H-1a — Sterowanie emisją ciepła (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `central_automatic_control` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `zonal_control` | 2 | official_methodology | nie |
| `bms_integration` | 3 | official_methodology | nie |
| `digital_communication` | 3 | official_methodology | nie |
| `occupancy_detection` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: central_automatic_control, temperature_measurement; FL2: central_automatic_control, temperature_measurement, zonal_control; FL3: bms_integration, central_automatic_control, digital_communication, temperature_measurement, zonal_control; FL4: bms_integration, central_automatic_control, digital_communication, occupancy_detection, temperature_measurement, zonal_control

#### H-1b — Sterowanie emisją dla TABS (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `central_automatic_control` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | engineering_assumption | nie |
| `zonal_control` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |
| `weather_data` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: central_automatic_control, temperature_measurement; FL2: central_automatic_control, demand_based_control, temperature_measurement, zonal_control; FL3: central_automatic_control, demand_based_control, predictive_control, temperature_measurement, weather_data, zonal_control

#### H-1c — Sterowanie temperaturą medium w sieci grzewczej (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `weather_data` | 1 | official_methodology | nie |
| `demand_based_control` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: temperature_measurement, weather_data; FL2: demand_based_control, temperature_measurement, weather_data

#### H-1d — Sterowanie pompami obiegowymi w instalacji grzewczej (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `demand_based_control` | 1 | official_methodology | nie |
| `variable_speed_drive` | 2 | official_methodology | tak |
| `digital_communication` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: demand_based_control; FL2: demand_based_control, variable_speed_drive; FL3: demand_based_control, variable_speed_drive; FL4: demand_based_control, digital_communication, variable_speed_drive

#### H-1f — Sterowanie źródłem ciepła (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `scheduling` | 1 | engineering_assumption | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `thermal_storage` | 1 | official_methodology | tak |
| `demand_based_control` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: scheduling, temperature_measurement, thermal_storage; FL2: demand_based_control, scheduling, temperature_measurement, thermal_storage; FL3: demand_based_control, grid_signal_interface, scheduling, temperature_measurement, thermal_storage

#### H-2a — Sterowanie wytwarzaniem ciepła (pompy ciepła) (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `modulating_generator` | 1 | official_methodology | tak |
| `weather_data` | 1 | engineering_assumption | nie |
| `bms_integration` | 2 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: modulating_generator, weather_data; FL2: bms_integration, demand_based_control, modulating_generator, weather_data

#### H-2b — Sterowanie magazynem energii cieplnej (ogrzewanie) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `modulating_generator` | 1 | official_methodology | tak |
| `weather_data` | 1 | engineering_assumption | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `temperature_measurement` | 2 | engineering_assumption | nie |
| `grid_signal_interface` | 3 | engineering_assumption | nie |
| `predictive_control` | 3 | official_methodology | nie |
| `thermal_storage` | 3 | engineering_assumption | tak |

_Prerekwizyty:_ FL1: modulating_generator, weather_data; FL2: demand_based_control, modulating_generator, temperature_measurement, weather_data; FL3: demand_based_control, grid_signal_interface, modulating_generator, predictive_control, temperature_measurement, thermal_storage, weather_data

#### H-2d — Sekwencjonowanie wielu źródeł ciepła (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `sequencing_controller` | 1 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `grid_signal_interface` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |
| `weather_data` | 4 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: sequencing_controller; FL2: energy_metering, sequencing_controller; FL3: energy_metering, grid_signal_interface, sequencing_controller; FL4: energy_metering, grid_signal_interface, predictive_control, sequencing_controller, weather_data

#### H-3 — Elastyczność sterowania źródłem ciepła (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `fault_detection` | 3 | engineering_assumption | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: reporting_platform; FL2: data_logging, energy_metering, reporting_platform; FL3: alarms, data_logging, energy_metering, fault_detection, reporting_platform; FL4: alarms, data_logging, energy_metering, fault_detection, predictive_control, reporting_platform

#### H-4 — Raportowanie informacji o pracy ogrzewania (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | official_methodology | nie |
| `scheduling` | 1 | engineering_assumption | nie |
| `thermal_storage` | 2 | engineering_assumption | tak |
| `predictive_control` | 3 | official_methodology | nie |
| `bidirectional_metering` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface, scheduling; FL2: grid_signal_interface, scheduling, thermal_storage; FL3: grid_signal_interface, predictive_control, scheduling, thermal_storage; FL4: bidirectional_metering, grid_signal_interface, predictive_control, scheduling, thermal_storage

### Oswietlenie (`lighting`)

#### L-1a — Sterowanie oświetleniem w zależności od obecności (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `occupancy_detection` | 1 | official_methodology | nie |
| `automated_switching_actuation` | 2 | official_methodology | nie |
| `digital_communication` | 3 | official_methodology | nie |
| `zonal_control` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: occupancy_detection; FL2: automated_switching_actuation, occupancy_detection; FL3: automated_switching_actuation, digital_communication, occupancy_detection, zonal_control

#### L-2 — Automatyczne sterowanie oświetleniem w zależności od światła dziennego (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `automated_switching_actuation` | 1 | engineering_assumption | nie |
| `daylight_measurement` | 1 | official_methodology | nie |
| `dimmable_lighting` | 2 | official_methodology | tak |
| `zonal_control` | 3 | official_methodology | nie |
| `digital_communication` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: automated_switching_actuation, daylight_measurement; FL2: automated_switching_actuation, daylight_measurement, dimmable_lighting; FL3: automated_switching_actuation, daylight_measurement, dimmable_lighting, zonal_control; FL4: automated_switching_actuation, daylight_measurement, digital_communication, dimmable_lighting, zonal_control

### Monitoring i sterowanie (`monitoring_and_control`)

#### MC-13 — Harmonogramowanie pracy systemów HVAC (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `bms_integration` | 1 | engineering_assumption | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `energy_metering` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |
| `fault_detection` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: bms_integration, reporting_platform; FL2: bms_integration, data_logging, energy_metering, reporting_platform; FL3: alarms, bms_integration, data_logging, energy_metering, fault_detection, reporting_platform

#### MC-25 — Wykrywanie usterek TBS i wsparcie diagnostyki (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | official_methodology | nie |
| `bidirectional_metering` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface; FL2: bidirectional_metering, grid_signal_interface

#### MC-28 — Detekcja obecności powiązana z usługami budynku (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `grid_signal_interface` | 1 | engineering_assumption | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `bidirectional_metering` | 2 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: grid_signal_interface, reporting_platform; FL2: bidirectional_metering, data_logging, grid_signal_interface, reporting_platform

#### MC-29 — Raportowanie efektów zarządzania popytem (DSM) (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `dsm_override` | 1 | official_methodology | nie |
| `grid_signal_interface` | 1 | engineering_assumption | nie |
| `zonal_control` | 2 | official_methodology | nie |
| `data_logging` | 3 | official_methodology | nie |
| `predictive_control` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: dsm_override, grid_signal_interface; FL2: dsm_override, grid_signal_interface, zonal_control; FL3: data_logging, dsm_override, grid_signal_interface, zonal_control; FL4: data_logging, dsm_override, grid_signal_interface, predictive_control, zonal_control

#### MC-3 — Centralne raportowanie pracy TBS i zużycia energii (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `scheduling` | 1 | official_methodology | nie |
| `predictive_control` | 2 | official_methodology | nie |
| `weather_data` | 2 | engineering_assumption | nie |
| `occupancy_detection` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: scheduling; FL2: predictive_control, scheduling, weather_data; FL3: occupancy_detection, predictive_control, scheduling, weather_data

#### MC-30 — Optymalizacja przepływów energii wg obecności, pogody i sygnałów sieci (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `bms_integration` | 1 | official_methodology | nie |
| `digital_communication` | 2 | official_methodology | nie |
| `reporting_platform` | 2 | engineering_assumption | nie |
| `grid_signal_interface` | 3 | engineering_assumption | nie |
| `occupancy_detection` | 3 | engineering_assumption | nie |
| `predictive_control` | 3 | official_methodology | nie |
| `weather_data` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: bms_integration; FL2: bms_integration, digital_communication, reporting_platform; FL3: bms_integration, digital_communication, grid_signal_interface, occupancy_detection, predictive_control, reporting_platform, weather_data

#### MC-4 — Integracja z inteligentną siecią (harmonizacja TBS) (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `alarms` | 1 | official_methodology | nie |
| `fault_detection` | 2 | official_methodology | nie |
| `remote_access` | 3 | engineering_assumption | nie |
| `reporting_platform` | 3 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: alarms; FL2: alarms, fault_detection; FL3: alarms, fault_detection, remote_access, reporting_platform

#### MC-9 — Jedna platforma automatycznego sterowania i koordynacji TBS (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `occupancy_detection` | 1 | official_methodology | nie |
| `bms_integration` | 2 | official_methodology | nie |
| `digital_communication` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: occupancy_detection; FL2: bms_integration, digital_communication, occupancy_detection

### Wentylacja (`ventilation`)

#### V-1a — Sterowanie przepływem powietrza nawiewanego w pomieszczeniu (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `demand_based_control` | 1 | engineering_assumption | nie |
| `scheduling` | 1 | official_methodology | nie |
| `occupancy_detection` | 2 | official_methodology | nie |
| `co2_measurement` | 3 | official_methodology | nie |
| `bms_integration` | 4 | official_methodology | nie |
| `digital_communication` | 4 | official_methodology | nie |

_Prerekwizyty:_ FL1: demand_based_control, scheduling; FL2: demand_based_control, occupancy_detection, scheduling; FL3: co2_measurement, demand_based_control, occupancy_detection, scheduling; FL4: bms_integration, co2_measurement, demand_based_control, digital_communication, occupancy_detection, scheduling

#### V-1c — Sterowanie przepływem/ciśnieniem na poziomie centrali wentylacyjnej (FLmax 4)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `demand_based_control` | 1 | official_methodology | nie |
| `variable_speed_drive` | 2 | official_methodology | tak |
| `digital_communication` | 3 | official_methodology | nie |
| `bms_integration` | 4 | engineering_assumption | nie |

_Prerekwizyty:_ FL1: demand_based_control; FL2: demand_based_control, variable_speed_drive; FL3: demand_based_control, digital_communication, variable_speed_drive; FL4: bms_integration, demand_based_control, digital_communication, variable_speed_drive

#### V-2c — Sterowanie odzyskiem ciepła: zapobieganie przegrzewaniu (FLmax 2)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `heat_recovery_control` | 1 | official_methodology | tak |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `free_cooling` | 2 | official_methodology | nie |

_Prerekwizyty:_ FL1: heat_recovery_control, temperature_measurement; FL2: free_cooling, heat_recovery_control, temperature_measurement

#### V-2d — Sterowanie temperaturą powietrza nawiewanego w centrali (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `weather_data` | 1 | official_methodology | nie |
| `demand_based_control` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: temperature_measurement, weather_data; FL2: demand_based_control, temperature_measurement, weather_data; FL3: demand_based_control, predictive_control, temperature_measurement, weather_data

#### V-3 — Free cooling z wykorzystaniem mechanicznej wentylacji (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `free_cooling` | 1 | official_methodology | nie |
| `temperature_measurement` | 1 | engineering_assumption | nie |
| `humidity_measurement` | 2 | official_methodology | nie |
| `predictive_control` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: free_cooling, temperature_measurement; FL2: free_cooling, humidity_measurement, temperature_measurement; FL3: free_cooling, humidity_measurement, predictive_control, temperature_measurement

#### V-6 — Monitorowanie jakości powietrza wewnętrznego (FLmax 3)

| Capability | min FL | source_type | ręczna wer. |
|---|---|---|---|
| `co2_measurement` | 1 | official_methodology | nie |
| `reporting_platform` | 1 | official_methodology | nie |
| `data_logging` | 2 | official_methodology | nie |
| `alarms` | 3 | official_methodology | nie |

_Prerekwizyty:_ FL1: co2_measurement, reporting_platform; FL2: co2_measurement, data_logging, reporting_platform; FL3: alarms, co2_measurement, data_logging, reporting_platform

## Zaleznosci miedzydomenowe (funkcje wspolne)

| Czynnik | Capability | source_type | Domeny |
|---|---|---|---|
| Obecnosc uzytkownikow | `occupancy_detection` | official_methodology | Ogrzewanie, Chlodzenie, Wentylacja, Oswietlenie, Monitoring i sterowanie |
| Pogoda / prognoza | `weather_data` | engineering_assumption | Ogrzewanie, Chlodzenie, Wentylacja, Dynamiczna obudowa budynku, Cieppla woda uzytkowa |
| PV i magazyn energii | `self_consumption_optimization` | official_methodology | Elektrycznosc, Ladowanie pojazdow elektrycznych, Ogrzewanie, Chlodzenie, Cieppla woda uzytkowa |
| Sygnaly sieci / taryfy | `grid_signal_interface` | official_methodology | Elektrycznosc, Ladowanie pojazdow elektrycznych, Ogrzewanie, Chlodzenie, Monitoring i sterowanie |
| Dane pomiarowe energii | `energy_metering` | official_methodology | Ogrzewanie, Chlodzenie, Cieppla woda uzytkowa, Elektrycznosc, Monitoring i sterowanie |
| Integracja cyfrowa / BMS | `bms_integration` | official_methodology | Ogrzewanie, Chlodzenie, Wentylacja, Oswietlenie, Dynamiczna obudowa budynku, Monitoring i sterowanie |

- **Obecnosc uzytkownikow**: Jedna wiarygodna detekcja obecnosci steruje ogrzewaniem, chlodzeniem, wentylacja i oswietleniem.
- **Pogoda / prognoza**: Dane pogodowe i prognoza wplywaja na ogrzewanie, chlodzenie, wentylacje, zacienienie i CWU.
- **PV i magazyn energii**: Lokalna produkcja i magazyn wplywaja na elektrycznosc, EV oraz elastycznosc HVAC/CWU (autokonsumpcja).
- **Sygnaly sieci / taryfy**: Sygnaly taryf/DSM/smart grid uruchamiaja elastycznosc w wielu domenach jednoczesnie.
- **Dane pomiarowe energii**: Pomiar energii/ciepla/chlodu zasila raportowanie i FDD we wszystkich domenach oraz raport centralny.
- **Integracja cyfrowa / BMS**: Integracja cyfrowa i BMS warunkuje wyzsze poziomy sterowania i koordynacje miedzydomenowa (MC-30).
