# SRI Blocking Conditions

> Czego brak **ogranicza pulap Functionality Level**. Wynika bezposrednio z modelu zaleznosci (advisory).

- Wygenerowano: `2026-07-09T15:51:17.584007+00:00`

## Blokady per usluga

| Usluga | Brakujaca capability | Blokuje od FL | Maks. FL bez niej | source_type |
|---|---|---|---|---|
| C-1a | `central_automatic_control` (Centralne sterowanie automatyczne) | 1 | 0 | official_methodology |
| C-1a | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| C-1a | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | official_methodology |
| C-1a | `bms_integration` (Integracja z BMS/BACS) | 3 | 2 | official_methodology |
| C-1a | `digital_communication` (Komunikacja cyfrowa sterownikow) | 3 | 2 | official_methodology |
| C-1a | `occupancy_detection` (Detekcja obecnosci) | 4 | 3 | official_methodology |
| C-1b | `central_automatic_control` (Centralne sterowanie automatyczne) | 1 | 0 | official_methodology |
| C-1b | `humidity_measurement` (Pomiar wilgotnosci) | 1 | 0 | engineering_assumption |
| C-1b | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| C-1b | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | official_methodology |
| C-1b | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| C-1b | `weather_data` (Dane pogodowe / prognoza) | 3 | 2 | engineering_assumption |
| C-1c | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| C-1c | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | official_methodology |
| C-1c | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| C-1d | `demand_based_control` (Sterowanie wg zapotrzebowania) | 1 | 0 | official_methodology |
| C-1d | `variable_speed_drive` (Naped o zmiennej predkosci (falownik)) | 2 | 1 | official_methodology |
| C-1d | `digital_communication` (Komunikacja cyfrowa sterownikow) | 4 | 3 | official_methodology |
| C-1f | `interlock_control` (Blokada/koordynacja trybow (interlock)) | 1 | 0 | official_methodology |
| C-1f | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| C-1f | `bms_integration` (Integracja z BMS/BACS) | 2 | 1 | official_methodology |
| C-1g | `scheduling` (Harmonogramy czasowe) | 1 | 0 | engineering_assumption |
| C-1g | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| C-1g | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 1 | 0 | official_methodology |
| C-1g | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| C-1g | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| C-2a | `modulating_generator` (Modulacja mocy zrodla) | 1 | 0 | official_methodology |
| C-2a | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | engineering_assumption |
| C-2a | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| C-2a | `free_cooling` (Free-cooling) | 3 | 2 | engineering_assumption |
| C-2a | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| C-2b | `sequencing_controller` (Sterownik kaskady/sekwencji zrodel) | 1 | 0 | official_methodology |
| C-2b | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| C-2b | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| C-2b | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| C-3 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| C-3 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| C-3 | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| C-3 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| C-3 | `fault_detection` (Wykrywanie usterek (FDD)) | 3 | 2 | engineering_assumption |
| C-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| C-4 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | official_methodology |
| C-4 | `scheduling` (Harmonogramy czasowe) | 1 | 0 | engineering_assumption |
| C-4 | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 2 | 1 | engineering_assumption |
| C-4 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| C-4 | `bidirectional_metering` (Pomiar dwukierunkowy) | 4 | 3 | official_methodology |
| DHW-1a | `scheduling` (Harmonogramy czasowe) | 1 | 0 | official_methodology |
| DHW-1a | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| DHW-1a | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| DHW-1a | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| DHW-1a | `self_consumption_optimization` (Optymalizacja autokonsumpcji) | 3 | 2 | engineering_assumption |
| DHW-1b | `scheduling` (Harmonogramy czasowe) | 1 | 0 | official_methodology |
| DHW-1b | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| DHW-1b | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| DHW-1b | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| DHW-1d | `solar_thermal_collector` (Kolektory sloneczne (solar thermal)) | 1 | 0 | official_methodology |
| DHW-1d | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| DHW-1d | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| DHW-1d | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| DHW-1d | `weather_data` (Dane pogodowe / prognoza) | 3 | 2 | engineering_assumption |
| DHW-2b | `sequencing_controller` (Sterownik kaskady/sekwencji zrodel) | 1 | 0 | official_methodology |
| DHW-2b | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| DHW-2b | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| DHW-2b | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| DHW-3 | `energy_metering` (Pomiar energii/ciepla/chlodu) | 1 | 0 | engineering_assumption |
| DHW-3 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| DHW-3 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| DHW-3 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| DHW-3 | `fault_detection` (Wykrywanie usterek (FDD)) | 3 | 2 | engineering_assumption |
| DHW-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| DE-1 | `shading_actuation` (Napedy zacienienia/rolet) | 1 | 0 | official_methodology |
| DE-1 | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | official_methodology |
| DE-1 | `temperature_measurement` (Pomiar temperatury) | 2 | 1 | engineering_assumption |
| DE-1 | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | engineering_assumption |
| DE-1 | `sun_position_tracking` (Sledzenie pozycji slonca) | 3 | 2 | official_methodology |
| DE-1 | `bms_integration` (Integracja z BMS/BACS) | 4 | 3 | official_methodology |
| DE-1 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| DE-2 | `bms_integration` (Integracja z BMS/BACS) | 1 | 0 | engineering_assumption |
| DE-2 | `window_contact` (Detekcja otwarcia okna) | 1 | 0 | official_methodology |
| DE-2 | `window_actuation` (Napedy okien/klap) | 2 | 1 | official_methodology |
| DE-2 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| DE-4 | `actuator_feedback` (Informacja zwrotna z napedow) | 1 | 0 | official_methodology |
| DE-4 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| DE-4 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| DE-4 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| DE-4 | `fault_detection` (Wykrywanie usterek (FDD)) | 3 | 2 | engineering_assumption |
| DE-4 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| EV-15 | `ev_charging_point` (Punkt ladowania EV) | 1 | 0 | official_methodology |
| EV-15 | `scheduling` (Harmonogramy czasowe) | 2 | 1 | official_methodology |
| EV-15 | `load_balancing` (Zarzadzanie moca ladowania (load balancing)) | 3 | 2 | official_methodology |
| EV-15 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 4 | 3 | engineering_assumption |
| EV-15 | `self_consumption_optimization` (Optymalizacja autokonsumpcji) | 4 | 3 | engineering_assumption |
| EV-16 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | official_methodology |
| EV-16 | `bidirectional_metering` (Pomiar dwukierunkowy) | 2 | 1 | official_methodology |
| EV-17 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| EV-17 | `charging_connectivity` (Laczonosc ladowania (OCPP/backend)) | 2 | 1 | official_methodology |
| EV-17 | `remote_access` (Zdalny dostep) | 2 | 1 | engineering_assumption |
| E-11 | `electrical_storage` (Magazyn energii elektrycznej) | 1 | 0 | engineering_assumption |
| E-11 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| E-11 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| E-11 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| E-11 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| E-12 | `energy_metering` (Pomiar energii/ciepla/chlodu) | 1 | 0 | official_methodology |
| E-12 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| E-12 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| E-12 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | engineering_assumption |
| E-12 | `submetering` (Podlicznikowanie (submetering)) | 3 | 2 | official_methodology |
| E-12 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| E-2 | `pv_monitoring` (Monitoring produkcji PV/OZE) | 1 | 0 | official_methodology |
| E-2 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| E-2 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| E-2 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| E-2 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| E-3 | `electrical_storage` (Magazyn energii elektrycznej) | 1 | 0 | official_methodology |
| E-3 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 2 | 1 | official_methodology |
| E-3 | `self_consumption_optimization` (Optymalizacja autokonsumpcji) | 2 | 1 | engineering_assumption |
| E-3 | `bidirectional_metering` (Pomiar dwukierunkowy) | 3 | 2 | official_methodology |
| E-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| E-4 | `local_generation` (Lokalna generacja (PV/CHP)) | 1 | 0 | engineering_assumption |
| E-4 | `self_consumption_optimization` (Optymalizacja autokonsumpcji) | 1 | 0 | official_methodology |
| E-4 | `bms_integration` (Integracja z BMS/BACS) | 2 | 1 | official_methodology |
| E-4 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| E-5 | `local_generation` (Lokalna generacja (PV/CHP)) | 1 | 0 | engineering_assumption |
| E-5 | `modulating_generator` (Modulacja mocy zrodla) | 1 | 0 | official_methodology |
| E-5 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 2 | 1 | official_methodology |
| E-5 | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 2 | 1 | engineering_assumption |
| E-8 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | official_methodology |
| E-8 | `electrical_storage` (Magazyn energii elektrycznej) | 2 | 1 | engineering_assumption |
| E-8 | `microgrid_controller` (Kontroler mikrosieci / praca wyspowa) | 2 | 1 | official_methodology |
| E-8 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| H-1a | `central_automatic_control` (Centralne sterowanie automatyczne) | 1 | 0 | official_methodology |
| H-1a | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| H-1a | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | official_methodology |
| H-1a | `bms_integration` (Integracja z BMS/BACS) | 3 | 2 | official_methodology |
| H-1a | `digital_communication` (Komunikacja cyfrowa sterownikow) | 3 | 2 | official_methodology |
| H-1a | `occupancy_detection` (Detekcja obecnosci) | 4 | 3 | official_methodology |
| H-1b | `central_automatic_control` (Centralne sterowanie automatyczne) | 1 | 0 | official_methodology |
| H-1b | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| H-1b | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | engineering_assumption |
| H-1b | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | official_methodology |
| H-1b | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| H-1b | `weather_data` (Dane pogodowe / prognoza) | 3 | 2 | engineering_assumption |
| H-1c | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| H-1c | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | official_methodology |
| H-1c | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| H-1d | `demand_based_control` (Sterowanie wg zapotrzebowania) | 1 | 0 | official_methodology |
| H-1d | `variable_speed_drive` (Naped o zmiennej predkosci (falownik)) | 2 | 1 | official_methodology |
| H-1d | `digital_communication` (Komunikacja cyfrowa sterownikow) | 4 | 3 | official_methodology |
| H-1f | `scheduling` (Harmonogramy czasowe) | 1 | 0 | engineering_assumption |
| H-1f | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| H-1f | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 1 | 0 | official_methodology |
| H-1f | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| H-1f | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| H-2a | `modulating_generator` (Modulacja mocy zrodla) | 1 | 0 | official_methodology |
| H-2a | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | engineering_assumption |
| H-2a | `bms_integration` (Integracja z BMS/BACS) | 2 | 1 | engineering_assumption |
| H-2a | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| H-2b | `modulating_generator` (Modulacja mocy zrodla) | 1 | 0 | official_methodology |
| H-2b | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | engineering_assumption |
| H-2b | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| H-2b | `temperature_measurement` (Pomiar temperatury) | 2 | 1 | engineering_assumption |
| H-2b | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | engineering_assumption |
| H-2b | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| H-2b | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 3 | 2 | engineering_assumption |
| H-2d | `sequencing_controller` (Sterownik kaskady/sekwencji zrodel) | 1 | 0 | official_methodology |
| H-2d | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| H-2d | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | official_methodology |
| H-2d | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| H-2d | `weather_data` (Dane pogodowe / prognoza) | 4 | 3 | engineering_assumption |
| H-3 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| H-3 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| H-3 | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| H-3 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| H-3 | `fault_detection` (Wykrywanie usterek (FDD)) | 3 | 2 | engineering_assumption |
| H-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| H-4 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | official_methodology |
| H-4 | `scheduling` (Harmonogramy czasowe) | 1 | 0 | engineering_assumption |
| H-4 | `thermal_storage` (Magazyn ciepla/chlodu (bufor/TES)) | 2 | 1 | engineering_assumption |
| H-4 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| H-4 | `bidirectional_metering` (Pomiar dwukierunkowy) | 4 | 3 | official_methodology |
| L-1a | `occupancy_detection` (Detekcja obecnosci) | 1 | 0 | official_methodology |
| L-1a | `automated_switching_actuation` (Automatyczne zalaczanie/wylaczanie) | 2 | 1 | official_methodology |
| L-1a | `digital_communication` (Komunikacja cyfrowa sterownikow) | 3 | 2 | official_methodology |
| L-1a | `zonal_control` (Sterowanie strefowe / indywidualne) | 3 | 2 | engineering_assumption |
| L-2 | `automated_switching_actuation` (Automatyczne zalaczanie/wylaczanie) | 1 | 0 | engineering_assumption |
| L-2 | `daylight_measurement` (Pomiar natezenia swiatla) | 1 | 0 | official_methodology |
| L-2 | `dimmable_lighting` (Oprawy scieramialne (dimming)) | 2 | 1 | official_methodology |
| L-2 | `zonal_control` (Sterowanie strefowe / indywidualne) | 3 | 2 | official_methodology |
| L-2 | `digital_communication` (Komunikacja cyfrowa sterownikow) | 4 | 3 | official_methodology |
| MC-13 | `bms_integration` (Integracja z BMS/BACS) | 1 | 0 | engineering_assumption |
| MC-13 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| MC-13 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| MC-13 | `energy_metering` (Pomiar energii/ciepla/chlodu) | 2 | 1 | official_methodology |
| MC-13 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |
| MC-13 | `fault_detection` (Wykrywanie usterek (FDD)) | 3 | 2 | engineering_assumption |
| MC-25 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | official_methodology |
| MC-25 | `bidirectional_metering` (Pomiar dwukierunkowy) | 2 | 1 | official_methodology |
| MC-28 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | engineering_assumption |
| MC-28 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| MC-28 | `bidirectional_metering` (Pomiar dwukierunkowy) | 2 | 1 | official_methodology |
| MC-28 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| MC-29 | `dsm_override` (Nadrzedne sterowanie DSM (override)) | 1 | 0 | official_methodology |
| MC-29 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 1 | 0 | engineering_assumption |
| MC-29 | `zonal_control` (Sterowanie strefowe / indywidualne) | 2 | 1 | official_methodology |
| MC-29 | `data_logging` (Rejestracja i historia danych (trendy)) | 3 | 2 | official_methodology |
| MC-29 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 4 | 3 | official_methodology |
| MC-3 | `scheduling` (Harmonogramy czasowe) | 1 | 0 | official_methodology |
| MC-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 2 | 1 | official_methodology |
| MC-3 | `weather_data` (Dane pogodowe / prognoza) | 2 | 1 | engineering_assumption |
| MC-3 | `occupancy_detection` (Detekcja obecnosci) | 3 | 2 | official_methodology |
| MC-30 | `bms_integration` (Integracja z BMS/BACS) | 1 | 0 | official_methodology |
| MC-30 | `digital_communication` (Komunikacja cyfrowa sterownikow) | 2 | 1 | official_methodology |
| MC-30 | `reporting_platform` (Platforma raportowania/wizualizacji) | 2 | 1 | engineering_assumption |
| MC-30 | `grid_signal_interface` (Interfejs sygnalow sieci/taryf) | 3 | 2 | engineering_assumption |
| MC-30 | `occupancy_detection` (Detekcja obecnosci) | 3 | 2 | engineering_assumption |
| MC-30 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| MC-30 | `weather_data` (Dane pogodowe / prognoza) | 3 | 2 | engineering_assumption |
| MC-4 | `alarms` (Alarmy i powiadomienia) | 1 | 0 | official_methodology |
| MC-4 | `fault_detection` (Wykrywanie usterek (FDD)) | 2 | 1 | official_methodology |
| MC-4 | `remote_access` (Zdalny dostep) | 3 | 2 | engineering_assumption |
| MC-4 | `reporting_platform` (Platforma raportowania/wizualizacji) | 3 | 2 | engineering_assumption |
| MC-9 | `occupancy_detection` (Detekcja obecnosci) | 1 | 0 | official_methodology |
| MC-9 | `bms_integration` (Integracja z BMS/BACS) | 2 | 1 | official_methodology |
| MC-9 | `digital_communication` (Komunikacja cyfrowa sterownikow) | 2 | 1 | official_methodology |
| V-1a | `demand_based_control` (Sterowanie wg zapotrzebowania) | 1 | 0 | engineering_assumption |
| V-1a | `scheduling` (Harmonogramy czasowe) | 1 | 0 | official_methodology |
| V-1a | `occupancy_detection` (Detekcja obecnosci) | 2 | 1 | official_methodology |
| V-1a | `co2_measurement` (Pomiar CO2 / jakosci powietrza) | 3 | 2 | official_methodology |
| V-1a | `bms_integration` (Integracja z BMS/BACS) | 4 | 3 | official_methodology |
| V-1a | `digital_communication` (Komunikacja cyfrowa sterownikow) | 4 | 3 | official_methodology |
| V-1c | `demand_based_control` (Sterowanie wg zapotrzebowania) | 1 | 0 | official_methodology |
| V-1c | `variable_speed_drive` (Naped o zmiennej predkosci (falownik)) | 2 | 1 | official_methodology |
| V-1c | `digital_communication` (Komunikacja cyfrowa sterownikow) | 3 | 2 | official_methodology |
| V-1c | `bms_integration` (Integracja z BMS/BACS) | 4 | 3 | engineering_assumption |
| V-2c | `heat_recovery_control` (Sterowanie odzyskiem ciepla (by-pass)) | 1 | 0 | official_methodology |
| V-2c | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| V-2c | `free_cooling` (Free-cooling) | 2 | 1 | official_methodology |
| V-2d | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| V-2d | `weather_data` (Dane pogodowe / prognoza) | 1 | 0 | official_methodology |
| V-2d | `demand_based_control` (Sterowanie wg zapotrzebowania) | 2 | 1 | official_methodology |
| V-2d | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| V-3 | `free_cooling` (Free-cooling) | 1 | 0 | official_methodology |
| V-3 | `temperature_measurement` (Pomiar temperatury) | 1 | 0 | engineering_assumption |
| V-3 | `humidity_measurement` (Pomiar wilgotnosci) | 2 | 1 | official_methodology |
| V-3 | `predictive_control` (Sterowanie predykcyjne / optymalizacja) | 3 | 2 | official_methodology |
| V-6 | `co2_measurement` (Pomiar CO2 / jakosci powietrza) | 1 | 0 | official_methodology |
| V-6 | `reporting_platform` (Platforma raportowania/wizualizacji) | 1 | 0 | official_methodology |
| V-6 | `data_logging` (Rejestracja i historia danych (trendy)) | 2 | 1 | official_methodology |
| V-6 | `alarms` (Alarmy i powiadomienia) | 3 | 2 | official_methodology |

## Braki wplywajace na wiele uslug (efekt dzwigni)

> Uzupelnienie tych funkcji podnosi pulap w wielu uslugach naraz — priorytet dla rekomendacji.

| Capability | Nazwa | Uslug | Domen | Uslugi |
|---|---|---|---|---|
| `predictive_control` | Sterowanie predykcyjne / optymalizacja | 27 | 7 | C-1b, C-2a, C-2b, C-3, C-4, DE-1, DE-2, DE-4, DHW-1d, DHW-2b, DHW-3, E-11, E-12, E-2, E-3, E-4, E-8, H-1b, H-2b, H-2d, H-3, H-4, MC-29, MC-3, MC-30, V-2d, V-3 |
| `grid_signal_interface` | Interfejs sygnalow sieci/taryf | 19 | 6 | C-1g, C-2b, C-4, DHW-1a, DHW-1b, DHW-2b, E-3, E-5, E-8, EV-15, EV-16, H-1f, H-2b, H-2d, H-4, MC-25, MC-28, MC-29, MC-30 |
| `temperature_measurement` | Pomiar temperatury | 17 | 5 | C-1a, C-1b, C-1c, C-1f, C-1g, DE-1, DHW-1a, DHW-1b, DHW-1d, H-1a, H-1b, H-1c, H-1f, H-2b, V-2c, V-2d, V-3 |
| `demand_based_control` | Sterowanie wg zapotrzebowania | 16 | 4 | C-1c, C-1d, C-1g, C-2a, DHW-1a, DHW-1b, DHW-1d, H-1b, H-1c, H-1d, H-1f, H-2a, H-2b, V-1a, V-1c, V-2d |
| `reporting_platform` | Platforma raportowania/wizualizacji | 13 | 8 | C-3, DE-4, DHW-3, E-11, E-12, E-2, EV-17, H-3, MC-13, MC-28, MC-30, MC-4, V-6 |
| `weather_data` | Dane pogodowe / prognoza | 13 | 6 | C-1b, C-1c, C-2a, DE-1, DHW-1d, H-1b, H-1c, H-2a, H-2b, H-2d, MC-3, MC-30, V-2d |
| `bms_integration` | Integracja z BMS/BACS | 12 | 6 | C-1a, C-1f, DE-1, DE-2, E-4, H-1a, H-2a, MC-13, MC-30, MC-9, V-1a, V-1c |
| `data_logging` | Rejestracja i historia danych (trendy) | 11 | 7 | C-3, DE-4, DHW-3, E-11, E-12, E-2, H-3, MC-13, MC-28, MC-29, V-6 |
| `alarms` | Alarmy i powiadomienia | 10 | 7 | C-3, DE-4, DHW-3, E-11, E-12, E-2, H-3, MC-13, MC-4, V-6 |
| `digital_communication` | Komunikacja cyfrowa sterownikow | 10 | 5 | C-1a, C-1d, H-1a, H-1d, L-1a, L-2, MC-30, MC-9, V-1a, V-1c |
| `scheduling` | Harmonogramy czasowe | 9 | 6 | C-1g, C-4, DHW-1a, DHW-1b, EV-15, H-1f, H-4, MC-3, V-1a |
| `energy_metering` | Pomiar energii/ciepla/chlodu | 8 | 5 | C-2b, C-3, DHW-2b, DHW-3, E-12, H-2d, H-3, MC-13 |
| `zonal_control` | Sterowanie strefowe / indywidualne | 8 | 5 | C-1a, C-1b, DE-1, H-1a, H-1b, L-1a, L-2, MC-29 |
| `occupancy_detection` | Detekcja obecnosci | 7 | 5 | C-1a, H-1a, L-1a, MC-3, MC-30, MC-9, V-1a |
| `bidirectional_metering` | Pomiar dwukierunkowy | 6 | 5 | C-4, E-3, EV-16, H-4, MC-25, MC-28 |
| `fault_detection` | Wykrywanie usterek (FDD) | 6 | 5 | C-3, DE-4, DHW-3, H-3, MC-13, MC-4 |
| `thermal_storage` | Magazyn ciepla/chlodu (bufor/TES) | 6 | 3 | C-1g, C-4, E-5, H-1f, H-2b, H-4 |
| `central_automatic_control` | Centralne sterowanie automatyczne | 4 | 2 | C-1a, C-1b, H-1a, H-1b |
| `modulating_generator` | Modulacja mocy zrodla | 4 | 3 | C-2a, E-5, H-2a, H-2b |
| `self_consumption_optimization` | Optymalizacja autokonsumpcji | 4 | 3 | DHW-1a, E-3, E-4, EV-15 |
| `electrical_storage` | Magazyn energii elektrycznej | 3 | 1 | E-11, E-3, E-8 |
| `free_cooling` | Free-cooling | 3 | 2 | C-2a, V-2c, V-3 |
| `sequencing_controller` | Sterownik kaskady/sekwencji zrodel | 3 | 3 | C-2b, DHW-2b, H-2d |
| `variable_speed_drive` | Naped o zmiennej predkosci (falownik) | 3 | 3 | C-1d, H-1d, V-1c |
| `automated_switching_actuation` | Automatyczne zalaczanie/wylaczanie | 2 | 1 | L-1a, L-2 |
| `co2_measurement` | Pomiar CO2 / jakosci powietrza | 2 | 1 | V-1a, V-6 |
| `humidity_measurement` | Pomiar wilgotnosci | 2 | 2 | C-1b, V-3 |
| `local_generation` | Lokalna generacja (PV/CHP) | 2 | 1 | E-4, E-5 |
| `remote_access` | Zdalny dostep | 2 | 2 | EV-17, MC-4 |
