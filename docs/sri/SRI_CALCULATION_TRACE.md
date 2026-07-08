# SRI — Pelny slad obliczen (Calculation Trace)

Krok po kroku dla kazdego scenariusza: punktacja uslug, agregacja domen,
7 kryteriow oddzialywania, wagi, obliczenia posrednie, wynik i klasa.

**Legenda kryteriow:** EE=energy_efficiency, FLEX=energy_flexibility_and_storage, COMF=comfort, CONV=convenience, HEALTH=health_wellbeing_accessibility, MAINT=maintenance_and_fault_prediction, INFO=information_to_occupants

---
# Scenariusz 1: Budynek praktycznie bez automatyki

Typ: `non_residential`, strefa: `west_europe`, domeny obecne: cooling, domestic_hot_water, heating, lighting, ventilation

## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)

| Usluga | FL | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|---|
| `C-1a` | 0/4 | 0/3 | 0/0 | 0/2 | 0/3 | 0/2 | 0/1 | 0/0 |
| `C-2a` | 0/3 | 0/2 | 0/3 | 0/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `DHW-1b` | 0/3 | 0/2 | 0/3 | 0/0 | 0/2 | 0/0 | 0/0 | 0/0 |
| `H-1a` | 0/4 | 0/3 | 0/0 | 0/2 | 0/3 | 0/2 | 0/1 | 0/0 |
| `H-2a` | 0/2 | 0/2 | 0/0 | 0/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `L-1a` | 0/3 | 0/3 | 0/0 | 0/2 | 0/2 | 0/0 | 0/0 | 0/0 |
| `V-1a` | 0/4 | 0/3 | 0/0 | 0/3 | 0/3 | 0/3 | 0/0 | 0/0 |

*(format: wynik_wybrany / wynik_przy_FLmax)*

## 2. Suma punktow per domena i kryterium (achieved / maxposs)

| Domena | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|
| cooling | 0/5 | 0/3 | 0/4 | 0/3 | 0/2 | 0/1 | 0/0 |
| domestic_hot_water | 0/2 | 0/3 | 0/0 | 0/2 | 0/0 | 0/0 | 0/0 |
| heating | 0/5 | 0/0 | 0/4 | 0/3 | 0/2 | 0/1 | 0/0 |
| lighting | 0/3 | 0/0 | 0/2 | 0/2 | 0/0 | 0/0 | 0/0 |
| ventilation | 0/3 | 0/0 | 0/3 | 0/3 | 0/3 | 0/0 | 0/0 |

## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen

### EE — energy_efficiency

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 5 | 0.0000 | 0.1267 | 0.1738 | 0.0000 |
| domestic_hot_water | 0 | 2 | 0.0000 | 0.0826 | 0.1133 | 0.0000 |
| heating | 0 | 5 | 0.0000 | 0.2728 | 0.3742 | 0.0000 |
| lighting | 0 | 3 | 0.0000 | 0.1038 | 0.1424 | 0.0000 |
| ventilation | 0 | 3 | 0.0000 | 0.1431 | 0.1963 | 0.0000 |
| **SUMA** | | | | 0.7289 | 1.0000 | **0.0000** |

### FLEX — energy_flexibility_and_storage

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 3 | 0.0000 | 0.1889 | 0.6054 | 0.0000 |
| domestic_hot_water | 0 | 3 | 0.0000 | 0.1231 | 0.3946 | 0.0000 |
| **SUMA** | | | | 0.3120 | 1.0000 | **0.0000** |

### COMF — comfort

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 4 | 0.0000 | 0.1600 | 0.2500 | 0.0000 |
| heating | 0 | 4 | 0.0000 | 0.1600 | 0.2500 | 0.0000 |
| lighting | 0 | 2 | 0.0000 | 0.1600 | 0.2500 | 0.0000 |
| ventilation | 0 | 3 | 0.0000 | 0.1600 | 0.2500 | 0.0000 |
| **SUMA** | | | | 0.6400 | 1.0000 | **0.0000** |

### CONV — convenience

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 3 | 0.0000 | 0.1000 | 0.2000 | 0.0000 |
| domestic_hot_water | 0 | 2 | 0.0000 | 0.1000 | 0.2000 | 0.0000 |
| heating | 0 | 3 | 0.0000 | 0.1000 | 0.2000 | 0.0000 |
| lighting | 0 | 2 | 0.0000 | 0.1000 | 0.2000 | 0.0000 |
| ventilation | 0 | 3 | 0.0000 | 0.1000 | 0.2000 | 0.0000 |
| **SUMA** | | | | 0.5000 | 1.0000 | **0.0000** |

### HEALTH — health_wellbeing_accessibility

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 2 | 0.0000 | 0.1600 | 0.3333 | 0.0000 |
| heating | 0 | 2 | 0.0000 | 0.1600 | 0.3333 | 0.0000 |
| ventilation | 0 | 3 | 0.0000 | 0.1600 | 0.3333 | 0.0000 |
| **SUMA** | | | | 0.4800 | 1.0000 | **0.0000** |

### MAINT — maintenance_and_fault_prediction

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 1 | 0.0000 | 0.1470 | 0.3172 | 0.0000 |
| heating | 0 | 1 | 0.0000 | 0.3166 | 0.6828 | 0.0000 |
| **SUMA** | | | | 0.4636 | 1.0000 | **0.0000** |

### INFO — information_to_occupants

Brak domen wnoszacych wklad (wszystkie maxposs = 0) → SR = 0.

## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)

| Kryterium | W_f(ic) | SR(ic) | W_f × SR |
|---|---|---|---|
| EE | 0.1667 | 0.0000 | 0.0000 |
| FLEX | 0.3333 | 0.0000 | 0.0000 |
| COMF | 0.0833 | 0.0000 | 0.0000 |
| CONV | 0.0833 | 0.0000 | 0.0000 |
| HEALTH | 0.0833 | 0.0000 | 0.0000 |
| MAINT | 0.1667 | 0.0000 | 0.0000 |
| INFO | 0.0833 | 0.0000 | 0.0000 |
| **RAZEM** | **1.0000** | | **0.0000** |

**SRI = 0.0000 = 0.00% → klasa G**

## 5. Wyniki 3 kluczowych funkcjonalnosci

| Kluczowa funkcjonalnosc | Wynik |
|---|---|
| energy_performance_and_operation (EE, MAINT) | 0.00% |
| response_to_occupant_needs (COMF, CONV, HEALTH, INFO) | 0.00% |
| energy_flexibility (FLEX) | 0.00% |

---
# Scenariusz 2: Maly budynek biurowy

Typ: `non_residential`, strefa: `west_europe`, domeny obecne: cooling, domestic_hot_water, dynamic_building_envelope, heating, lighting, ventilation

## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)

| Usluga | FL | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|---|
| `C-1a` | 2/4 | 1/3 | 0/0 | 1/2 | 2/3 | 2/2 | 0/1 | 0/0 |
| `C-2a` | 2/3 | 2/2 | 1/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `DE-1` | 2/4 | 2/3 | 0/0 | 1/3 | 2/3 | 1/3 | 0/0 | 0/0 |
| `DHW-1b` | 2/3 | 2/2 | 2/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `H-1a` | 2/4 | 2/3 | 0/0 | 2/2 | 2/3 | 2/2 | 0/1 | 0/0 |
| `H-1c` | 2/2 | 2/2 | 0/0 | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 |
| `H-2a` | 2/2 | 2/2 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `L-1a` | 2/3 | 2/3 | 0/0 | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 |
| `L-2` | 2/4 | 2/3 | 0/0 | 1/3 | 1/3 | 1/3 | 0/0 | 0/0 |
| `V-1a` | 2/4 | 1/3 | 0/0 | 2/3 | 2/3 | 2/3 | 0/0 | 0/0 |
| `V-2d` | 1/3 | 1/3 | 0/0 | 1/2 | 1/1 | 0/0 | 0/0 | 0/0 |

*(format: wynik_wybrany / wynik_przy_FLmax)*

## 2. Suma punktow per domena i kryterium (achieved / maxposs)

| Domena | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|
| cooling | 3/5 | 1/3 | 3/4 | 2/3 | 2/2 | 0/1 | 0/0 |
| domestic_hot_water | 2/2 | 2/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| dynamic_building_envelope | 2/3 | 0/0 | 1/3 | 2/3 | 1/3 | 0/0 | 0/0 |
| heating | 6/7 | 0/0 | 5/5 | 3/4 | 2/2 | 0/1 | 0/0 |
| lighting | 4/6 | 0/0 | 3/5 | 3/5 | 1/3 | 0/0 | 0/0 |
| ventilation | 2/6 | 0/0 | 3/5 | 3/4 | 2/3 | 0/0 | 0/0 |

## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen

### EE — energy_efficiency

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 5 | 0.6000 | 0.1267 | 0.1627 | 0.0976 |
| domestic_hot_water | 2 | 2 | 1.0000 | 0.0826 | 0.1060 | 0.1060 |
| dynamic_building_envelope | 2 | 3 | 0.6667 | 0.0500 | 0.0642 | 0.0428 |
| heating | 6 | 7 | 0.8571 | 0.2728 | 0.3502 | 0.3002 |
| lighting | 4 | 6 | 0.6667 | 0.1038 | 0.1332 | 0.0888 |
| ventilation | 2 | 6 | 0.3333 | 0.1431 | 0.1837 | 0.0612 |
| **SUMA** | | | | 0.7789 | 1.0000 | **0.6966** |

### FLEX — energy_flexibility_and_storage

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 1 | 3 | 0.3333 | 0.1889 | 0.6054 | 0.2018 |
| domestic_hot_water | 2 | 3 | 0.6667 | 0.1231 | 0.3946 | 0.2631 |
| **SUMA** | | | | 0.3120 | 1.0000 | **0.4649** |

### COMF — comfort

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 4 | 0.7500 | 0.1600 | 0.2000 | 0.1500 |
| dynamic_building_envelope | 1 | 3 | 0.3333 | 0.1600 | 0.2000 | 0.0667 |
| heating | 5 | 5 | 1.0000 | 0.1600 | 0.2000 | 0.2000 |
| lighting | 3 | 5 | 0.6000 | 0.1600 | 0.2000 | 0.1200 |
| ventilation | 3 | 5 | 0.6000 | 0.1600 | 0.2000 | 0.1200 |
| **SUMA** | | | | 0.8000 | 1.0000 | **0.6567** |

### CONV — convenience

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 3 | 0.6667 | 0.1000 | 0.1667 | 0.1111 |
| domestic_hot_water | 2 | 2 | 1.0000 | 0.1000 | 0.1667 | 0.1667 |
| dynamic_building_envelope | 2 | 3 | 0.6667 | 0.1000 | 0.1667 | 0.1111 |
| heating | 3 | 4 | 0.7500 | 0.1000 | 0.1667 | 0.1250 |
| lighting | 3 | 5 | 0.6000 | 0.1000 | 0.1667 | 0.1000 |
| ventilation | 3 | 4 | 0.7500 | 0.1000 | 0.1667 | 0.1250 |
| **SUMA** | | | | 0.6000 | 1.0000 | **0.7389** |

### HEALTH — health_wellbeing_accessibility

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 2 | 1.0000 | 0.1600 | 0.2000 | 0.2000 |
| dynamic_building_envelope | 1 | 3 | 0.3333 | 0.1600 | 0.2000 | 0.0667 |
| heating | 2 | 2 | 1.0000 | 0.1600 | 0.2000 | 0.2000 |
| lighting | 1 | 3 | 0.3333 | 0.1600 | 0.2000 | 0.0667 |
| ventilation | 2 | 3 | 0.6667 | 0.1600 | 0.2000 | 0.1333 |
| **SUMA** | | | | 0.8000 | 1.0000 | **0.6667** |

### MAINT — maintenance_and_fault_prediction

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 0 | 1 | 0.0000 | 0.1470 | 0.3172 | 0.0000 |
| heating | 0 | 1 | 0.0000 | 0.3166 | 0.6828 | 0.0000 |
| **SUMA** | | | | 0.4636 | 1.0000 | **0.0000** |

### INFO — information_to_occupants

Brak domen wnoszacych wklad (wszystkie maxposs = 0) → SR = 0.

## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)

| Kryterium | W_f(ic) | SR(ic) | W_f × SR |
|---|---|---|---|
| EE | 0.1667 | 0.6966 | 0.1161 |
| FLEX | 0.3333 | 0.4649 | 0.1550 |
| COMF | 0.0833 | 0.6567 | 0.0547 |
| CONV | 0.0833 | 0.7389 | 0.0616 |
| HEALTH | 0.0833 | 0.6667 | 0.0556 |
| MAINT | 0.1667 | 0.0000 | 0.0000 |
| INFO | 0.0833 | 0.0000 | 0.0000 |
| **RAZEM** | **1.0000** | | **0.4429** |

**SRI = 0.4429 = 44.29% → klasa E**

## 5. Wyniki 3 kluczowych funkcjonalnosci

| Kluczowa funkcjonalnosc | Wynik |
|---|---|
| energy_performance_and_operation (EE, MAINT) | 34.83% |
| response_to_occupant_needs (COMF, CONV, HEALTH, INFO) | 51.56% |
| energy_flexibility (FLEX) | 46.49% |

---
# Scenariusz 3: Nowoczesny biurowiec (BMS, BACnet, PV, magazyn, EV)

Typ: `non_residential`, strefa: `west_europe`, domeny obecne: cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation

## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)

| Usluga | FL | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|---|
| `C-1a` | 4/4 | 3/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `C-1d` | 3/4 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-2a` | 3/3 | 2/2 | 3/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-2b` | 4/4 | 3/3 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 3/3 | 3/3 |
| `C-4` | 3/4 | 2/2 | 3/3 | 2/3 | 3/3 | 0/1 | 0/0 | 0/0 |
| `DE-1` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `DE-2` | 2/3 | 2/2 | 0/0 | 2/2 | 1/2 | 1/1 | 0/0 | 0/0 |
| `DE-4` | 4/4 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `DHW-1b` | 3/3 | 2/2 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `DHW-2b` | 3/4 | 3/3 | 2/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `DHW-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-11` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-12` | 4/4 | 3/3 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-2` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-3` | 4/4 | 0/0 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `E-4` | 3/3 | 0/0 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `EV-15` | 4/4 | 0/0 | 0/0 | 0/0 | 3/3 | 0/0 | 0/0 | 0/0 |
| `EV-16` | 2/2 | 0/0 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `EV-17` | 2/2 | 0/0 | 1/1 | 0/0 | 1/1 | 0/0 | 0/0 | 3/3 |
| `H-1a` | 4/4 | 3/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `H-1c` | 2/2 | 2/2 | 0/0 | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 |
| `H-1d` | 3/4 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-2b` | 2/3 | 2/2 | 1/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-2d` | 4/4 | 3/3 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 3/3 | 3/3 |
| `H-4` | 3/4 | 2/2 | 3/3 | 2/3 | 3/3 | 0/1 | 0/0 | 0/0 |
| `L-1a` | 3/3 | 3/3 | 0/0 | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 |
| `L-2` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `MC-13` | 3/3 | 1/1 | 0/0 | 0/0 | 3/3 | 0/0 | 3/3 | 3/3 |
| `MC-25` | 2/2 | 1/1 | 3/3 | 0/0 | 1/1 | 0/0 | 0/0 | 0/0 |
| `MC-3` | 3/3 | 3/3 | 2/2 | 2/2 | 3/3 | 1/1 | 0/0 | 0/0 |
| `MC-30` | 3/3 | 2/2 | 0/0 | 0/0 | 3/3 | 0/0 | 1/1 | 0/0 |
| `MC-4` | 2/3 | 0/0 | 0/0 | 0/0 | 2/3 | 2/3 | 2/3 | 2/3 |
| `MC-9` | 2/2 | 1/1 | 0/0 | 1/1 | 1/1 | 0/0 | 2/2 | 0/0 |
| `V-1a` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `V-1c` | 3/4 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `V-2d` | 3/3 | 3/3 | 0/0 | 2/2 | 1/1 | 0/0 | 0/0 | 0/0 |
| `V-3` | 2/3 | 2/3 | 0/0 | 3/3 | 2/2 | 1/1 | 0/0 | 0/0 |
| `V-6` | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 3/3 | 2/2 | 3/3 |

*(format: wynik_wybrany / wynik_przy_FLmax)*

## 2. Suma punktow per domena i kryterium (achieved / maxposs)

| Domena | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|
| cooling | 13/13 | 9/9 | 6/7 | 7/7 | 2/3 | 4/4 | 3/3 |
| domestic_hot_water | 6/6 | 5/6 | 0/0 | 3/3 | 0/0 | 2/2 | 3/3 |
| dynamic_building_envelope | 5/5 | 0/0 | 5/5 | 5/6 | 4/4 | 2/2 | 3/3 |
| electric_vehicle_charging | 0/0 | 4/4 | 0/0 | 6/6 | 0/0 | 0/0 | 3/3 |
| electricity | 5/5 | 6/6 | 0/0 | 7/7 | 0/0 | 6/6 | 9/9 |
| heating | 15/15 | 7/9 | 7/8 | 8/8 | 2/3 | 4/4 | 3/3 |
| lighting | 6/6 | 0/0 | 5/5 | 5/5 | 3/3 | 0/0 | 0/0 |
| monitoring_and_control | 8/8 | 5/5 | 3/3 | 13/14 | 3/4 | 8/9 | 5/6 |
| ventilation | 11/12 | 0/0 | 8/8 | 6/6 | 7/7 | 2/2 | 3/3 |

## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen

### EE — energy_efficiency

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 13 | 13 | 1.0000 | 0.1267 | 0.1267 | 0.1267 |
| domestic_hot_water | 6 | 6 | 1.0000 | 0.0826 | 0.0826 | 0.0826 |
| dynamic_building_envelope | 5 | 5 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 5 | 5 | 1.0000 | 0.0211 | 0.0211 | 0.0211 |
| heating | 15 | 15 | 1.0000 | 0.2728 | 0.2728 | 0.2728 |
| lighting | 6 | 6 | 1.0000 | 0.1038 | 0.1038 | 0.1038 |
| monitoring_and_control | 8 | 8 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 11 | 12 | 0.9167 | 0.1431 | 0.1431 | 0.1312 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9881** |

### FLEX — energy_flexibility_and_storage

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 9 | 9 | 1.0000 | 0.1889 | 0.1889 | 0.1889 |
| domestic_hot_water | 5 | 6 | 0.8333 | 0.1231 | 0.1231 | 0.1026 |
| electric_vehicle_charging | 4 | 4 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 6 | 6 | 1.0000 | 0.0314 | 0.0314 | 0.0314 |
| heating | 7 | 9 | 0.7778 | 0.4066 | 0.4066 | 0.3163 |
| monitoring_and_control | 5 | 5 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.8891** |

### COMF — comfort

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 6 | 7 | 0.8571 | 0.1600 | 0.1600 | 0.1371 |
| dynamic_building_envelope | 5 | 5 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| heating | 7 | 8 | 0.8750 | 0.1600 | 0.1600 | 0.1400 |
| lighting | 5 | 5 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| monitoring_and_control | 3 | 3 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 8 | 8 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9571** |

### CONV — convenience

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 7 | 7 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| domestic_hot_water | 3 | 3 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| dynamic_building_envelope | 5 | 6 | 0.8333 | 0.1000 | 0.1000 | 0.0833 |
| electric_vehicle_charging | 6 | 6 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| electricity | 7 | 7 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| heating | 8 | 8 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| lighting | 5 | 5 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| monitoring_and_control | 13 | 14 | 0.9286 | 0.2000 | 0.2000 | 0.1857 |
| ventilation | 6 | 6 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9690** |

### HEALTH — health_wellbeing_accessibility

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 3 | 0.6667 | 0.1600 | 0.1600 | 0.1067 |
| dynamic_building_envelope | 4 | 4 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| heating | 2 | 3 | 0.6667 | 0.1600 | 0.1600 | 0.1067 |
| lighting | 3 | 3 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| monitoring_and_control | 3 | 4 | 0.7500 | 0.2000 | 0.2000 | 0.1500 |
| ventilation | 7 | 7 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.8433** |

### MAINT — maintenance_and_fault_prediction

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 4 | 4 | 1.0000 | 0.1470 | 0.1470 | 0.1470 |
| domestic_hot_water | 2 | 2 | 1.0000 | 0.0958 | 0.0958 | 0.0958 |
| dynamic_building_envelope | 2 | 2 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 6 | 6 | 1.0000 | 0.0245 | 0.0245 | 0.0245 |
| heating | 4 | 4 | 1.0000 | 0.3166 | 0.3166 | 0.3166 |
| monitoring_and_control | 8 | 9 | 0.8889 | 0.2000 | 0.2000 | 0.1778 |
| ventilation | 2 | 2 | 1.0000 | 0.1661 | 0.1661 | 0.1661 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9778** |

### INFO — information_to_occupants

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| domestic_hot_water | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| dynamic_building_envelope | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| electric_vehicle_charging | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| electricity | 9 | 9 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| heating | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| monitoring_and_control | 5 | 6 | 0.8333 | 0.2000 | 0.2000 | 0.1667 |
| ventilation | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9667** |

## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)

| Kryterium | W_f(ic) | SR(ic) | W_f × SR |
|---|---|---|---|
| EE | 0.1667 | 0.9881 | 0.1647 |
| FLEX | 0.3333 | 0.8891 | 0.2964 |
| COMF | 0.0833 | 0.9571 | 0.0798 |
| CONV | 0.0833 | 0.9690 | 0.0808 |
| HEALTH | 0.0833 | 0.8433 | 0.0703 |
| MAINT | 0.1667 | 0.9778 | 0.1630 |
| INFO | 0.0833 | 0.9667 | 0.0806 |
| **RAZEM** | **1.0000** | | **0.9354** |

**SRI = 0.9354 = 93.54% → klasa A**

## 5. Wyniki 3 kluczowych funkcjonalnosci

| Kluczowa funkcjonalnosc | Wynik |
|---|---|
| energy_performance_and_operation (EE, MAINT) | 98.29% |
| response_to_occupant_needs (COMF, CONV, HEALTH, INFO) | 93.40% |
| energy_flexibility (FLEX) | 88.91% |

---
# Scenariusz 4: Sklep typu Decathlon (Loxone, BACnet, Modbus)

Typ: `non_residential`, strefa: `west_europe`, domeny obecne: cooling, domestic_hot_water, dynamic_building_envelope, electricity, heating, lighting, monitoring_and_control, ventilation

## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)

| Usluga | FL | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|---|
| `C-1a` | 3/4 | 2/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `C-2a` | 2/3 | 2/2 | 1/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-3` | 3/4 | 1/1 | 0/0 | 0/0 | 0/1 | 0/0 | 1/3 | 3/3 |
| `DE-1` | 2/4 | 2/3 | 0/0 | 1/3 | 2/3 | 1/3 | 0/0 | 0/0 |
| `DHW-1b` | 2/3 | 2/2 | 2/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `DHW-3` | 3/4 | 1/1 | 0/0 | 0/0 | 0/1 | 0/0 | 1/2 | 3/3 |
| `E-12` | 3/4 | 2/3 | 0/0 | 0/0 | 0/1 | 0/0 | 1/2 | 3/3 |
| `H-1a` | 3/4 | 2/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `H-1c` | 2/2 | 2/2 | 0/0 | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 |
| `H-2a` | 2/2 | 2/2 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-3` | 3/4 | 1/1 | 0/0 | 0/0 | 0/1 | 0/0 | 1/3 | 3/3 |
| `L-1a` | 3/3 | 3/3 | 0/0 | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 |
| `L-2` | 3/4 | 3/3 | 0/0 | 2/3 | 2/3 | 2/3 | 0/0 | 0/0 |
| `MC-13` | 3/3 | 1/1 | 0/0 | 0/0 | 3/3 | 0/0 | 3/3 | 3/3 |
| `MC-3` | 3/3 | 3/3 | 2/2 | 2/2 | 3/3 | 1/1 | 0/0 | 0/0 |
| `MC-30` | 3/3 | 2/2 | 0/0 | 0/0 | 3/3 | 0/0 | 1/1 | 0/0 |
| `MC-4` | 2/3 | 0/0 | 0/0 | 0/0 | 2/3 | 2/3 | 2/3 | 2/3 |
| `V-1a` | 3/4 | 2/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `V-1c` | 2/4 | 2/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `V-6` | 2/3 | 0/0 | 0/0 | 0/0 | 0/0 | 3/3 | 1/2 | 2/3 |

*(format: wynik_wybrany / wynik_przy_FLmax)*

## 2. Suma punktow per domena i kryterium (achieved / maxposs)

| Domena | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|
| cooling | 5/6 | 1/3 | 4/4 | 3/4 | 2/2 | 2/4 | 3/3 |
| domestic_hot_water | 3/3 | 2/3 | 0/0 | 2/3 | 0/0 | 1/2 | 3/3 |
| dynamic_building_envelope | 2/3 | 0/0 | 1/3 | 2/3 | 1/3 | 0/0 | 0/0 |
| electricity | 2/3 | 0/0 | 0/0 | 0/1 | 0/0 | 1/2 | 3/3 |
| heating | 7/8 | 0/0 | 5/5 | 4/5 | 2/2 | 2/4 | 3/3 |
| lighting | 6/6 | 0/0 | 4/5 | 4/5 | 2/3 | 0/0 | 0/0 |
| monitoring_and_control | 6/6 | 2/2 | 2/2 | 11/12 | 3/4 | 6/7 | 5/6 |
| ventilation | 4/6 | 0/0 | 3/3 | 3/3 | 6/6 | 1/2 | 2/3 |

## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen

### EE — energy_efficiency

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 5 | 6 | 0.8333 | 0.1267 | 0.1267 | 0.1056 |
| domestic_hot_water | 3 | 3 | 1.0000 | 0.0826 | 0.0826 | 0.0826 |
| dynamic_building_envelope | 2 | 3 | 0.6667 | 0.0500 | 0.0500 | 0.0333 |
| electricity | 2 | 3 | 0.6667 | 0.0211 | 0.0211 | 0.0140 |
| heating | 7 | 8 | 0.8750 | 0.2728 | 0.2728 | 0.2387 |
| lighting | 6 | 6 | 1.0000 | 0.1038 | 0.1038 | 0.1038 |
| monitoring_and_control | 6 | 6 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 4 | 6 | 0.6667 | 0.1431 | 0.1431 | 0.0954 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.8734** |

### FLEX — energy_flexibility_and_storage

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 1 | 3 | 0.3333 | 0.1889 | 0.3689 | 0.1230 |
| domestic_hot_water | 2 | 3 | 0.6667 | 0.1231 | 0.2405 | 0.1603 |
| monitoring_and_control | 2 | 2 | 1.0000 | 0.2000 | 0.3906 | 0.3906 |
| **SUMA** | | | | 0.5120 | 1.0000 | **0.6739** |

### COMF — comfort

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 4 | 4 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| dynamic_building_envelope | 1 | 3 | 0.3333 | 0.1600 | 0.1600 | 0.0533 |
| heating | 5 | 5 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| lighting | 4 | 5 | 0.8000 | 0.1600 | 0.1600 | 0.1280 |
| monitoring_and_control | 2 | 2 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 3 | 3 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.8613** |

### CONV — convenience

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 4 | 0.7500 | 0.1000 | 0.1111 | 0.0833 |
| domestic_hot_water | 2 | 3 | 0.6667 | 0.1000 | 0.1111 | 0.0741 |
| dynamic_building_envelope | 2 | 3 | 0.6667 | 0.1000 | 0.1111 | 0.0741 |
| electricity | 0 | 1 | 0.0000 | 0.1000 | 0.1111 | 0.0000 |
| heating | 4 | 5 | 0.8000 | 0.1000 | 0.1111 | 0.0889 |
| lighting | 4 | 5 | 0.8000 | 0.1000 | 0.1111 | 0.0889 |
| monitoring_and_control | 11 | 12 | 0.9167 | 0.2000 | 0.2222 | 0.2037 |
| ventilation | 3 | 3 | 1.0000 | 0.1000 | 0.1111 | 0.1111 |
| **SUMA** | | | | 0.9000 | 1.0000 | **0.7241** |

### HEALTH — health_wellbeing_accessibility

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 2 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| dynamic_building_envelope | 1 | 3 | 0.3333 | 0.1600 | 0.1600 | 0.0533 |
| heating | 2 | 2 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| lighting | 2 | 3 | 0.6667 | 0.1600 | 0.1600 | 0.1067 |
| monitoring_and_control | 3 | 4 | 0.7500 | 0.2000 | 0.2000 | 0.1500 |
| ventilation | 6 | 6 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.7900** |

### MAINT — maintenance_and_fault_prediction

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 4 | 0.5000 | 0.1470 | 0.1548 | 0.0774 |
| domestic_hot_water | 1 | 2 | 0.5000 | 0.0958 | 0.1009 | 0.0504 |
| electricity | 1 | 2 | 0.5000 | 0.0245 | 0.0257 | 0.0129 |
| heating | 2 | 4 | 0.5000 | 0.3166 | 0.3333 | 0.1666 |
| monitoring_and_control | 6 | 7 | 0.8571 | 0.2000 | 0.2105 | 0.1805 |
| ventilation | 1 | 2 | 0.5000 | 0.1661 | 0.1748 | 0.0874 |
| **SUMA** | | | | 0.9500 | 1.0000 | **0.5752** |

### INFO — information_to_occupants

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 3 | 1.0000 | 0.1143 | 0.1481 | 0.1481 |
| domestic_hot_water | 3 | 3 | 1.0000 | 0.1143 | 0.1481 | 0.1481 |
| electricity | 3 | 3 | 1.0000 | 0.1143 | 0.1481 | 0.1481 |
| heating | 3 | 3 | 1.0000 | 0.1143 | 0.1481 | 0.1481 |
| monitoring_and_control | 5 | 6 | 0.8333 | 0.2000 | 0.2593 | 0.2160 |
| ventilation | 2 | 3 | 0.6667 | 0.1143 | 0.1481 | 0.0988 |
| **SUMA** | | | | 0.7714 | 1.0000 | **0.9074** |

## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)

| Kryterium | W_f(ic) | SR(ic) | W_f × SR |
|---|---|---|---|
| EE | 0.1667 | 0.8734 | 0.1456 |
| FLEX | 0.3333 | 0.6739 | 0.2246 |
| COMF | 0.0833 | 0.8613 | 0.0718 |
| CONV | 0.0833 | 0.7241 | 0.0603 |
| HEALTH | 0.0833 | 0.7900 | 0.0658 |
| MAINT | 0.1667 | 0.5752 | 0.0959 |
| INFO | 0.0833 | 0.9074 | 0.0756 |
| **RAZEM** | **1.0000** | | **0.7396** |

**SRI = 0.7396 = 73.96% → klasa C**

## 5. Wyniki 3 kluczowych funkcjonalnosci

| Kluczowa funkcjonalnosc | Wynik |
|---|---|
| energy_performance_and_operation (EE, MAINT) | 72.43% |
| response_to_occupant_needs (COMF, CONV, HEALTH, INFO) | 82.07% |
| energy_flexibility (FLEX) | 67.39% |

---
# Scenariusz 5: Szpital (pelne instalacje, monitoring, redundancja)

Typ: `non_residential`, strefa: `west_europe`, domeny obecne: cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation

## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)

| Usluga | FL | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|---|
| `C-1a` | 4/4 | 3/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `C-1c` | 2/2 | 2/2 | 0/0 | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 |
| `C-1d` | 4/4 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-1g` | 2/3 | 2/2 | 1/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-2a` | 3/3 | 2/2 | 3/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-2b` | 3/4 | 3/3 | 2/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `C-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 3/3 | 3/3 |
| `C-4` | 3/4 | 2/2 | 3/3 | 2/3 | 3/3 | 0/1 | 0/0 | 0/0 |
| `DE-1` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `DE-2` | 2/3 | 2/2 | 0/0 | 2/2 | 1/2 | 1/1 | 0/0 | 0/0 |
| `DE-4` | 4/4 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `DHW-1b` | 3/3 | 2/2 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `DHW-1d` | 2/3 | 2/3 | 1/2 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `DHW-2b` | 4/4 | 3/3 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `DHW-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-11` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-12` | 4/4 | 3/3 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-2` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 3/3 |
| `E-3` | 4/4 | 0/0 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `E-4` | 2/3 | 0/0 | 2/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `E-8` | 3/3 | 0/0 | 3/3 | 0/0 | 3/3 | 0/0 | 0/0 | 0/0 |
| `EV-15` | 4/4 | 0/0 | 0/0 | 0/0 | 3/3 | 0/0 | 0/0 | 0/0 |
| `EV-16` | 2/2 | 0/0 | 3/3 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 |
| `EV-17` | 2/2 | 0/0 | 1/1 | 0/0 | 1/1 | 0/0 | 0/0 | 3/3 |
| `H-1a` | 4/4 | 3/3 | 0/0 | 2/2 | 3/3 | 2/2 | 1/1 | 0/0 |
| `H-1b` | 2/3 | 1/2 | 0/0 | 1/2 | 2/3 | 2/2 | 0/1 | 0/1 |
| `H-1c` | 2/2 | 2/2 | 0/0 | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 |
| `H-1d` | 4/4 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-1f` | 2/3 | 2/2 | 1/2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-2b` | 3/3 | 2/2 | 3/3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-2d` | 3/4 | 3/3 | 2/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `H-3` | 4/4 | 1/1 | 0/0 | 0/0 | 1/1 | 0/0 | 3/3 | 3/3 |
| `H-4` | 3/4 | 2/2 | 3/3 | 2/3 | 3/3 | 0/1 | 0/0 | 0/0 |
| `L-1a` | 3/3 | 3/3 | 0/0 | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 |
| `L-2` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `MC-13` | 3/3 | 1/1 | 0/0 | 0/0 | 3/3 | 0/0 | 3/3 | 3/3 |
| `MC-25` | 2/2 | 1/1 | 3/3 | 0/0 | 1/1 | 0/0 | 0/0 | 0/0 |
| `MC-28` | 2/2 | 0/0 | 2/2 | 0/0 | 0/0 | 0/0 | 1/1 | 3/3 |
| `MC-29` | 3/4 | 0/0 | 1/2 | 0/0 | 2/3 | 0/0 | 1/1 | 0/0 |
| `MC-3` | 3/3 | 3/3 | 2/2 | 2/2 | 3/3 | 1/1 | 0/0 | 0/0 |
| `MC-30` | 3/3 | 2/2 | 0/0 | 0/0 | 3/3 | 0/0 | 1/1 | 0/0 |
| `MC-4` | 3/3 | 0/0 | 0/0 | 0/0 | 3/3 | 3/3 | 3/3 | 3/3 |
| `MC-9` | 2/2 | 1/1 | 0/0 | 1/1 | 1/1 | 0/0 | 2/2 | 0/0 |
| `V-1a` | 4/4 | 3/3 | 0/0 | 3/3 | 3/3 | 3/3 | 0/0 | 0/0 |
| `V-1c` | 4/4 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `V-2c` | 2/2 | 2/2 | 0/0 | 2/2 | 2/2 | 2/2 | 0/0 | 0/0 |
| `V-2d` | 2/3 | 2/3 | 0/0 | 2/2 | 1/1 | 0/0 | 0/0 | 0/0 |
| `V-3` | 3/3 | 3/3 | 0/0 | 3/3 | 2/2 | 1/1 | 0/0 | 0/0 |
| `V-6` | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 | 3/3 | 2/2 | 3/3 |

*(format: wynik_wybrany / wynik_przy_FLmax)*

## 2. Suma punktow per domena i kryterium (achieved / maxposs)

| Domena | EE | FLEX | COMF | CONV | HEALTH | MAINT | INFO |
|---|---|---|---|---|---|---|---|
| cooling | 17/17 | 9/11 | 7/8 | 8/8 | 2/3 | 4/4 | 3/3 |
| domestic_hot_water | 8/9 | 7/8 | 0/0 | 5/5 | 0/0 | 2/2 | 3/3 |
| dynamic_building_envelope | 5/5 | 0/0 | 5/5 | 5/6 | 4/4 | 2/2 | 3/3 |
| electric_vehicle_charging | 0/0 | 4/4 | 0/0 | 6/6 | 0/0 | 0/0 | 3/3 |
| electricity | 5/5 | 8/9 | 0/0 | 10/10 | 0/0 | 6/6 | 9/9 |
| heating | 18/19 | 9/11 | 8/10 | 10/11 | 4/5 | 4/5 | 3/4 |
| lighting | 6/6 | 0/0 | 5/5 | 5/5 | 3/3 | 0/0 | 0/0 |
| monitoring_and_control | 8/8 | 8/9 | 3/3 | 16/17 | 4/4 | 11/11 | 9/9 |
| ventilation | 13/14 | 0/0 | 10/10 | 8/8 | 9/9 | 2/2 | 3/3 |

## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen

### EE — energy_efficiency

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 17 | 17 | 1.0000 | 0.1267 | 0.1267 | 0.1267 |
| domestic_hot_water | 8 | 9 | 0.8889 | 0.0826 | 0.0826 | 0.0734 |
| dynamic_building_envelope | 5 | 5 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 5 | 5 | 1.0000 | 0.0211 | 0.0211 | 0.0211 |
| heating | 18 | 19 | 0.9474 | 0.2728 | 0.2728 | 0.2584 |
| lighting | 6 | 6 | 1.0000 | 0.1038 | 0.1038 | 0.1038 |
| monitoring_and_control | 8 | 8 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 13 | 14 | 0.9286 | 0.1431 | 0.1431 | 0.1329 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9662** |

### FLEX — energy_flexibility_and_storage

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 9 | 11 | 0.8182 | 0.1889 | 0.1889 | 0.1545 |
| domestic_hot_water | 7 | 8 | 0.8750 | 0.1231 | 0.1231 | 0.1077 |
| electric_vehicle_charging | 4 | 4 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 8 | 9 | 0.8889 | 0.0314 | 0.0314 | 0.0279 |
| heating | 9 | 11 | 0.8182 | 0.4066 | 0.4066 | 0.3327 |
| monitoring_and_control | 8 | 9 | 0.8889 | 0.2000 | 0.2000 | 0.1778 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.8506** |

### COMF — comfort

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 7 | 8 | 0.8750 | 0.1600 | 0.1600 | 0.1400 |
| dynamic_building_envelope | 5 | 5 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| heating | 8 | 10 | 0.8000 | 0.1600 | 0.1600 | 0.1280 |
| lighting | 5 | 5 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| monitoring_and_control | 3 | 3 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 10 | 10 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9480** |

### CONV — convenience

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 8 | 8 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| domestic_hot_water | 5 | 5 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| dynamic_building_envelope | 5 | 6 | 0.8333 | 0.1000 | 0.1000 | 0.0833 |
| electric_vehicle_charging | 6 | 6 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| electricity | 10 | 10 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| heating | 10 | 11 | 0.9091 | 0.1000 | 0.1000 | 0.0909 |
| lighting | 5 | 5 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| monitoring_and_control | 16 | 17 | 0.9412 | 0.2000 | 0.2000 | 0.1882 |
| ventilation | 8 | 8 | 1.0000 | 0.1000 | 0.1000 | 0.1000 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9625** |

### HEALTH — health_wellbeing_accessibility

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 2 | 3 | 0.6667 | 0.1600 | 0.1600 | 0.1067 |
| dynamic_building_envelope | 4 | 4 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| heating | 4 | 5 | 0.8000 | 0.1600 | 0.1600 | 0.1280 |
| lighting | 3 | 3 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| monitoring_and_control | 4 | 4 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 9 | 9 | 1.0000 | 0.1600 | 0.1600 | 0.1600 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9147** |

### MAINT — maintenance_and_fault_prediction

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 4 | 4 | 1.0000 | 0.1470 | 0.1470 | 0.1470 |
| domestic_hot_water | 2 | 2 | 1.0000 | 0.0958 | 0.0958 | 0.0958 |
| dynamic_building_envelope | 2 | 2 | 1.0000 | 0.0500 | 0.0500 | 0.0500 |
| electricity | 6 | 6 | 1.0000 | 0.0245 | 0.0245 | 0.0245 |
| heating | 4 | 5 | 0.8000 | 0.3166 | 0.3166 | 0.2533 |
| monitoring_and_control | 11 | 11 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 2 | 2 | 1.0000 | 0.1661 | 0.1661 | 0.1661 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9367** |

### INFO — information_to_occupants

| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |
|---|---|---|---|---|---|---|
| cooling | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| domestic_hot_water | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| dynamic_building_envelope | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| electric_vehicle_charging | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| electricity | 9 | 9 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| heating | 3 | 4 | 0.7500 | 0.1143 | 0.1143 | 0.0857 |
| monitoring_and_control | 9 | 9 | 1.0000 | 0.2000 | 0.2000 | 0.2000 |
| ventilation | 3 | 3 | 1.0000 | 0.1143 | 0.1143 | 0.1143 |
| **SUMA** | | | | 1.0000 | 1.0000 | **0.9714** |

## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)

| Kryterium | W_f(ic) | SR(ic) | W_f × SR |
|---|---|---|---|
| EE | 0.1667 | 0.9662 | 0.1610 |
| FLEX | 0.3333 | 0.8506 | 0.2835 |
| COMF | 0.0833 | 0.9480 | 0.0790 |
| CONV | 0.0833 | 0.9625 | 0.0802 |
| HEALTH | 0.0833 | 0.9147 | 0.0762 |
| MAINT | 0.1667 | 0.9367 | 0.1561 |
| INFO | 0.0833 | 0.9714 | 0.0810 |
| **RAZEM** | **1.0000** | | **0.9171** |

**SRI = 0.9171 = 91.71% → klasa A**

## 5. Wyniki 3 kluczowych funkcjonalnosci

| Kluczowa funkcjonalnosc | Wynik |
|---|---|
| energy_performance_and_operation (EE, MAINT) | 95.15% |
| response_to_occupant_needs (COMF, CONV, HEALTH, INFO) | 94.91% |
| energy_flexibility (FLEX) | 85.06% |

---
# Scenariusz 6: Budynek z blednymi danymi (test walidacji)

Silnik **nie policzyl wyniku** — dane odrzucone na etapie walidacji.
Szczegoly bledow w `SRI_VALIDATION_REPORT.md`.

