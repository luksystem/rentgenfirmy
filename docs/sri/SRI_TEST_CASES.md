# SRI — Scenariusze testowe (Test Cases)

6 fikcyjnych budynkow do walidacji silnika obliczeniowego SRI. Bez UI, bez formularzy.
Kody uslug zgodne z katalogiem `docs/sri/catalogue/services-authoritative.json` (v4.5).

> Definicje w `store/sri/engine/scenarios.py`, silnik w `store/sri/engine/sri_engine.py`.

## Scenariusz 1: Budynek praktycznie bez automatyki

- **Oczekiwanie:** bardzo niski wynik (klasa F/G)
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** Wszystkie podstawowe uslugi HVAC/oswietlenia na poziomie 0 (brak sterowania).
- **Domeny obecne (5/9):** cooling, domestic_hot_water, heating, lighting, ventilation
- **Liczba uslug:** 7

| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |
|---|---|---|---|---|
| `C-1a` | cooling | 0 | 4 | Cooling emission control |
| `C-2a` | cooling | 0 | 3 | Generator control for cooling |
| `DHW-1b` | domestic_hot_water | 0 | 3 | Control of DHW storage charging (using hot water generation) |
| `H-1a` | heating | 0 | 4 | Heat emission control |
| `H-2a` | heating | 0 | 2 | Heat generator control (all except heat pumps) |
| `L-1a` | lighting | 0 | 3 | Occupancy control for indoor lighting |
| `V-1a` | ventilation | 0 | 4 | Supply air flow control at the room level |

- **Wynik:** **0.00%** → klasa **G** (klasa nr 7)

## Scenariusz 2: Maly budynek biurowy

- **Oczekiwanie:** sredni wynik (klasa E/D) — pulap ograniczony brakiem elastycznosci i raportowania
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** Sterowanie czasowe + podzial na strefy. Brak monitoringu energii, brak alarmow, brak CO2, brak elastycznosci (PV/magazyn/EV) - to swiadomie ogranicza pulap wyniku.
- **Domeny obecne (6/9):** cooling, domestic_hot_water, dynamic_building_envelope, heating, lighting, ventilation
- **Liczba uslug:** 11

| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |
|---|---|---|---|---|
| `C-1a` | cooling | 2 | 4 | Cooling emission control |
| `C-2a` | cooling | 2 | 3 | Generator control for cooling |
| `DE-1` | dynamic_building_envelope | 2 | 4 | Window solar shading control |
| `DHW-1b` | domestic_hot_water | 2 | 3 | Control of DHW storage charging (using hot water generation) |
| `H-1a` | heating | 2 | 4 | Heat emission control |
| `H-1c` | heating | 2 | 2 | Control of distribution fluid temperature (supply or return  |
| `H-2a` | heating | 2 | 2 | Heat generator control (all except heat pumps) |
| `L-1a` | lighting | 2 | 3 | Occupancy control for indoor lighting |
| `L-2` | lighting | 2 | 4 | Control artificial lighting power based on daylight levels |
| `V-1a` | ventilation | 2 | 4 | Supply air flow control at the room level |
| `V-2d` | ventilation | 1 | 3 | Supply air temperature control at the air handling unit leve |

- **Wynik:** **44.29%** → klasa **E** (klasa nr 5)

## Scenariusz 3: Nowoczesny biurowiec (BMS, BACnet, PV, magazyn, EV)

- **Oczekiwanie:** bardzo wysoki wynik (klasa A/B)
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** Pelny BMS, pomiar i monitoring energii, HVAC, rolety, CO2, PV, magazyn energii, EV.
- **Domeny obecne (9/9):** cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation
- **Liczba uslug:** 40

| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |
|---|---|---|---|---|
| `C-1a` | cooling | 4 | 4 | Cooling emission control |
| `C-1d` | cooling | 3 | 4 | Control of distribution pumps in networks |
| `C-2a` | cooling | 3 | 3 | Generator control for cooling |
| `C-2b` | cooling | 4 | 4 | Sequencing of different cooling generators |
| `C-3` | cooling | 4 | 4 | Report information regarding cooling system performance |
| `C-4` | cooling | 3 | 4 | Flexibility and grid interaction |
| `DE-1` | dynamic_building_envelope | 4 | 4 | Window solar shading control |
| `DE-2` | dynamic_building_envelope | 2 | 3 | Window open/closed control, combined with HVAC system |
| `DE-4` | dynamic_building_envelope | 4 | 4 | Reporting information regarding performance of dynamic build |
| `DHW-1b` | domestic_hot_water | 3 | 3 | Control of DHW storage charging (using hot water generation) |
| `DHW-2b` | domestic_hot_water | 3 | 4 | Sequencing in case of different DHW generators |
| `DHW-3` | domestic_hot_water | 4 | 4 | Report information regarding domestic hot water performance |
| `E-11` | electricity | 4 | 4 | Reporting information regarding energy storage |
| `E-12` | electricity | 4 | 4 | Reporting information regarding electricity consumption |
| `E-2` | electricity | 4 | 4 | Reporting information regarding local electricity generation |
| `E-3` | electricity | 4 | 4 | Storage of (locally generated) electricity |
| `E-4` | electricity | 3 | 3 | Optimizing self-consumption of locally generated electricity |
| `EV-15` | electric_vehicle_charging | 4 | 4 | EV Charging Capacity |
| `EV-16` | electric_vehicle_charging | 2 | 2 | EV Charging Grid balancing |
| `EV-17` | electric_vehicle_charging | 2 | 2 | EV charging information and connectivity |
| `H-1a` | heating | 4 | 4 | Heat emission control |
| `H-1c` | heating | 2 | 2 | Control of distribution fluid temperature (supply or return  |
| `H-1d` | heating | 3 | 4 | Control of distribution pumps in networks |
| `H-2b` | heating | 2 | 3 | Heat generator control (for heat pumps) |
| `H-2d` | heating | 4 | 4 | Sequencing in case of different heat generators |
| `H-3` | heating | 4 | 4 | Report information regarding heating system performance |
| `H-4` | heating | 3 | 4 | Flexibility and grid interaction |
| `L-1a` | lighting | 3 | 3 | Occupancy control for indoor lighting |
| `L-2` | lighting | 4 | 4 | Control artificial lighting power based on daylight levels |
| `MC-13` | monitoring_and_control | 3 | 3 | Central reporting of TBS performance and energy use |
| `MC-25` | monitoring_and_control | 2 | 2 | Smart Grid Integration |
| `MC-3` | monitoring_and_control | 3 | 3 | Run time management of HVAC systems |
| `MC-30` | monitoring_and_control | 3 | 3 | Single platform that allows automated control & coordination |
| `MC-4` | monitoring_and_control | 2 | 3 | Detecting faults of technical building systems and providing |
| `MC-9` | monitoring_and_control | 2 | 2 | Occupancy detection: connected services |
| `V-1a` | ventilation | 4 | 4 | Supply air flow control at the room level |
| `V-1c` | ventilation | 3 | 4 | Air flow or pressure control at the air handler level |
| `V-2d` | ventilation | 3 | 3 | Supply air temperature control at the air handling unit leve |
| `V-3` | ventilation | 2 | 3 | Free cooling with mechanical ventilation system |
| `V-6` | ventilation | 3 | 3 | Reporting information regarding IAQ |

- **Wynik:** **93.54%** → klasa **A** (klasa nr 1)

## Scenariusz 4: Sklep typu Decathlon (Loxone, BACnet, Modbus)

- **Oczekiwanie:** wynik dobry (klasa B/C) - bez EV i pelnej elastycznosci
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** HVAC, oswietlenie, liczniki, dashboard, alarmy, raportowanie. Brak PV/magazynu/EV.
- **Domeny obecne (8/9):** cooling, domestic_hot_water, dynamic_building_envelope, electricity, heating, lighting, monitoring_and_control, ventilation
- **Liczba uslug:** 20

| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |
|---|---|---|---|---|
| `C-1a` | cooling | 3 | 4 | Cooling emission control |
| `C-2a` | cooling | 2 | 3 | Generator control for cooling |
| `C-3` | cooling | 3 | 4 | Report information regarding cooling system performance |
| `DE-1` | dynamic_building_envelope | 2 | 4 | Window solar shading control |
| `DHW-1b` | domestic_hot_water | 2 | 3 | Control of DHW storage charging (using hot water generation) |
| `DHW-3` | domestic_hot_water | 3 | 4 | Report information regarding domestic hot water performance |
| `E-12` | electricity | 3 | 4 | Reporting information regarding electricity consumption |
| `H-1a` | heating | 3 | 4 | Heat emission control |
| `H-1c` | heating | 2 | 2 | Control of distribution fluid temperature (supply or return  |
| `H-2a` | heating | 2 | 2 | Heat generator control (all except heat pumps) |
| `H-3` | heating | 3 | 4 | Report information regarding heating system performance |
| `L-1a` | lighting | 3 | 3 | Occupancy control for indoor lighting |
| `L-2` | lighting | 3 | 4 | Control artificial lighting power based on daylight levels |
| `MC-13` | monitoring_and_control | 3 | 3 | Central reporting of TBS performance and energy use |
| `MC-3` | monitoring_and_control | 3 | 3 | Run time management of HVAC systems |
| `MC-30` | monitoring_and_control | 3 | 3 | Single platform that allows automated control & coordination |
| `MC-4` | monitoring_and_control | 2 | 3 | Detecting faults of technical building systems and providing |
| `V-1a` | ventilation | 3 | 4 | Supply air flow control at the room level |
| `V-1c` | ventilation | 2 | 4 | Air flow or pressure control at the air handler level |
| `V-6` | ventilation | 2 | 3 | Reporting information regarding IAQ |

- **Wynik:** **73.96%** → klasa **C** (klasa nr 3)

## Scenariusz 5: Szpital (pelne instalacje, monitoring, redundancja)

- **Oczekiwanie:** bardzo wysoki wynik - wplyw wszystkich 9 domen
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** Wszystkie 9 domen obecne, wysokie poziomy, pelny monitoring i sterowanie.
- **Domeny obecne (9/9):** cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation
- **Liczba uslug:** 49

| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |
|---|---|---|---|---|
| `C-1a` | cooling | 4 | 4 | Cooling emission control |
| `C-1c` | cooling | 2 | 2 | Control of distribution network chilled water temperature (s |
| `C-1d` | cooling | 4 | 4 | Control of distribution pumps in networks |
| `C-1g` | cooling | 2 | 3 | Control of Thermal Energy Storage (TES) operation |
| `C-2a` | cooling | 3 | 3 | Generator control for cooling |
| `C-2b` | cooling | 3 | 4 | Sequencing of different cooling generators |
| `C-3` | cooling | 4 | 4 | Report information regarding cooling system performance |
| `C-4` | cooling | 3 | 4 | Flexibility and grid interaction |
| `DE-1` | dynamic_building_envelope | 4 | 4 | Window solar shading control |
| `DE-2` | dynamic_building_envelope | 2 | 3 | Window open/closed control, combined with HVAC system |
| `DE-4` | dynamic_building_envelope | 4 | 4 | Reporting information regarding performance of dynamic build |
| `DHW-1b` | domestic_hot_water | 3 | 3 | Control of DHW storage charging (using hot water generation) |
| `DHW-1d` | domestic_hot_water | 2 | 3 | Control of DHW storage charging (with solar collector and su |
| `DHW-2b` | domestic_hot_water | 4 | 4 | Sequencing in case of different DHW generators |
| `DHW-3` | domestic_hot_water | 4 | 4 | Report information regarding domestic hot water performance |
| `E-11` | electricity | 4 | 4 | Reporting information regarding energy storage |
| `E-12` | electricity | 4 | 4 | Reporting information regarding electricity consumption |
| `E-2` | electricity | 4 | 4 | Reporting information regarding local electricity generation |
| `E-3` | electricity | 4 | 4 | Storage of (locally generated) electricity |
| `E-4` | electricity | 2 | 3 | Optimizing self-consumption of locally generated electricity |
| `E-8` | electricity | 3 | 3 | Support of (micro)grid operation modes |
| `EV-15` | electric_vehicle_charging | 4 | 4 | EV Charging Capacity |
| `EV-16` | electric_vehicle_charging | 2 | 2 | EV Charging Grid balancing |
| `EV-17` | electric_vehicle_charging | 2 | 2 | EV charging information and connectivity |
| `H-1a` | heating | 4 | 4 | Heat emission control |
| `H-1b` | heating | 2 | 3 | Emission control for TABS (heating mode) |
| `H-1c` | heating | 2 | 2 | Control of distribution fluid temperature (supply or return  |
| `H-1d` | heating | 4 | 4 | Control of distribution pumps in networks |
| `H-1f` | heating | 2 | 3 | Thermal Energy Storage (TES) for building heating (excluding |
| `H-2b` | heating | 3 | 3 | Heat generator control (for heat pumps) |
| `H-2d` | heating | 3 | 4 | Sequencing in case of different heat generators |
| `H-3` | heating | 4 | 4 | Report information regarding heating system performance |
| `H-4` | heating | 3 | 4 | Flexibility and grid interaction |
| `L-1a` | lighting | 3 | 3 | Occupancy control for indoor lighting |
| `L-2` | lighting | 4 | 4 | Control artificial lighting power based on daylight levels |
| `MC-13` | monitoring_and_control | 3 | 3 | Central reporting of TBS performance and energy use |
| `MC-25` | monitoring_and_control | 2 | 2 | Smart Grid Integration |
| `MC-28` | monitoring_and_control | 2 | 2 | Reporting information regarding demand side management perfo |
| `MC-29` | monitoring_and_control | 3 | 4 | Override of DSM control |
| `MC-3` | monitoring_and_control | 3 | 3 | Run time management of HVAC systems |
| `MC-30` | monitoring_and_control | 3 | 3 | Single platform that allows automated control & coordination |
| `MC-4` | monitoring_and_control | 3 | 3 | Detecting faults of technical building systems and providing |
| `MC-9` | monitoring_and_control | 2 | 2 | Occupancy detection: connected services |
| `V-1a` | ventilation | 4 | 4 | Supply air flow control at the room level |
| `V-1c` | ventilation | 4 | 4 | Air flow or pressure control at the air handler level |
| `V-2c` | ventilation | 2 | 2 | Heat recovery control:
prevention of overheating |
| `V-2d` | ventilation | 2 | 3 | Supply air temperature control at the air handling unit leve |
| `V-3` | ventilation | 3 | 3 | Free cooling with mechanical ventilation system |
| `V-6` | ventilation | 3 | 3 | Reporting information regarding IAQ |

- **Wynik:** **91.71%** → klasa **A** (klasa nr 1)

## Scenariusz 6: Budynek z blednymi danymi (test walidacji)

- **Oczekiwanie:** silnik zwraca bledy walidacji zamiast wyniku
- **Typ budynku / strefa:** `non_residential` / `west_europe`
- **Opis:** Celowo: nieznany kod, poziom > FLmax, poziom ujemny, poziom niecalkowity.
- **Liczba pozycji:** 5 (dane celowo bledne)

| Usluga | Podany poziom |
|---|---|
| `H-1a` | 7 |
| `H-XX` | 2 |
| `C-1a` | -1 |
| `V-1a` | 2.5 |
| `L-1a` | 3 |

