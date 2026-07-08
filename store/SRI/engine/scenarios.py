"""6 fikcyjnych budynkow testowych dla walidacji silnika SRI.
Kody uslug zgodne z katalogiem v4.5 (services-authoritative.json).
"""

SCENARIOS = [
    {
        "id": 1,
        "title": "Budynek praktycznie bez automatyki",
        "expectation": "bardzo niski wynik (klasa F/G)",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "Wszystkie podstawowe uslugi HVAC/oswietlenia na poziomie 0 (brak sterowania).",
        "services": {
            "H-1a": 0, "H-2a": 0,
            "DHW-1b": 0,
            "C-1a": 0, "C-2a": 0,
            "V-1a": 0,
            "L-1a": 0,
        },
    },
    {
        "id": 2,
        "title": "Maly budynek biurowy",
        "expectation": "sredni wynik (klasa E/D) — pulap ograniczony brakiem elastycznosci i raportowania",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "Sterowanie czasowe + podzial na strefy. Brak monitoringu energii, brak alarmow, brak CO2, brak elastycznosci (PV/magazyn/EV) - to swiadomie ogranicza pulap wyniku.",
        "services": {
            "H-1a": 2, "H-1c": 2, "H-2a": 2,
            "DHW-1b": 2,
            "C-1a": 2, "C-2a": 2,
            "V-1a": 2, "V-2d": 1,
            "L-1a": 2, "L-2": 2,
            "DE-1": 2,
        },
    },
    {
        "id": 3,
        "title": "Nowoczesny biurowiec (BMS, BACnet, PV, magazyn, EV)",
        "expectation": "bardzo wysoki wynik (klasa A/B)",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "Pelny BMS, pomiar i monitoring energii, HVAC, rolety, CO2, PV, magazyn energii, EV.",
        "services": {
            "H-1a": 4, "H-1c": 2, "H-1d": 3, "H-2b": 2, "H-2d": 4, "H-3": 4, "H-4": 3,
            "DHW-1b": 3, "DHW-2b": 3, "DHW-3": 4,
            "C-1a": 4, "C-1d": 3, "C-2a": 3, "C-2b": 4, "C-3": 4, "C-4": 3,
            "V-1a": 4, "V-1c": 3, "V-2d": 3, "V-3": 2, "V-6": 3,
            "L-1a": 3, "L-2": 4,
            "DE-1": 4, "DE-2": 2, "DE-4": 4,
            "E-2": 4, "E-3": 4, "E-4": 3, "E-11": 4, "E-12": 4,
            "EV-15": 4, "EV-16": 2, "EV-17": 2,
            "MC-3": 3, "MC-4": 2, "MC-9": 2, "MC-13": 3, "MC-25": 2, "MC-30": 3,
        },
    },
    {
        "id": 4,
        "title": "Sklep typu Decathlon (Loxone, BACnet, Modbus)",
        "expectation": "wynik dobry (klasa B/C) - bez EV i pelnej elastycznosci",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "HVAC, oswietlenie, liczniki, dashboard, alarmy, raportowanie. Brak PV/magazynu/EV.",
        "services": {
            "H-1a": 3, "H-1c": 2, "H-2a": 2, "H-3": 3,
            "DHW-1b": 2, "DHW-3": 3,
            "C-1a": 3, "C-2a": 2, "C-3": 3,
            "V-1a": 3, "V-1c": 2, "V-6": 2,
            "L-1a": 3, "L-2": 3,
            "DE-1": 2,
            "E-12": 3,
            "MC-3": 3, "MC-4": 2, "MC-13": 3, "MC-30": 3,
        },
    },
    {
        "id": 5,
        "title": "Szpital (pelne instalacje, monitoring, redundancja)",
        "expectation": "bardzo wysoki wynik - wplyw wszystkich 9 domen",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "Wszystkie 9 domen obecne, wysokie poziomy, pelny monitoring i sterowanie.",
        "services": {
            "H-1a": 4, "H-1b": 2, "H-1c": 2, "H-1d": 4, "H-1f": 2, "H-2b": 3, "H-2d": 3, "H-3": 4, "H-4": 3,
            "DHW-1b": 3, "DHW-1d": 2, "DHW-2b": 4, "DHW-3": 4,
            "C-1a": 4, "C-1c": 2, "C-1d": 4, "C-1g": 2, "C-2a": 3, "C-2b": 3, "C-3": 4, "C-4": 3,
            "V-1a": 4, "V-1c": 4, "V-2c": 2, "V-2d": 2, "V-3": 3, "V-6": 3,
            "L-1a": 3, "L-2": 4,
            "DE-1": 4, "DE-2": 2, "DE-4": 4,
            "E-2": 4, "E-3": 4, "E-4": 2, "E-8": 3, "E-11": 4, "E-12": 4,
            "EV-15": 4, "EV-16": 2, "EV-17": 2,
            "MC-3": 3, "MC-4": 3, "MC-9": 2, "MC-13": 3, "MC-25": 2, "MC-28": 2, "MC-29": 3, "MC-30": 3,
        },
    },
    {
        "id": 6,
        "title": "Budynek z blednymi danymi (test walidacji)",
        "expectation": "silnik zwraca bledy walidacji zamiast wyniku",
        "building_type": "non_residential",
        "climate_zone": "west_europe",
        "notes": "Celowo: nieznany kod, poziom > FLmax, poziom ujemny, poziom niecalkowity.",
        "services": {
            "H-1a": 7,        # przekracza FLmax=4
            "H-XX": 2,        # nieznany kod
            "C-1a": -1,       # poziom ujemny
            "V-1a": 2.5,      # niecalkowity
            "L-1a": 3,        # poprawna (dla kontrastu)
        },
    },
]
