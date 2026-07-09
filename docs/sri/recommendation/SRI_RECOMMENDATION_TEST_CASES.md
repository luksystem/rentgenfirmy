# SRI Recommendation — Test Cases

- Wygenerowano: `2026-07-08T22:22:31.993509+00:00`

6 scenariuszy do walidacji Recommendation Engine. `services` = uslugi obecne (z poziomem FL); `missing_applicable` = systemy mozliwe, lecz niezainstalowane (kandydaci do rozbudowy).

## Scenariusz 1: Budynek bez automatyki

- Oczekiwanie: wynik bliski 0% — rekomendacje powinny obejmowac praktycznie wszystkie obecne uslugi
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: Instalacje HVAC/oswietlenia istnieja, ale bez zadnej automatyki (FL0).
- Uslugi obecne (7): H-1a=0, H-2a=0, DHW-1b=0, C-1a=0, C-2a=0, V-1a=0, L-1a=0
- Mozliwe do rozbudowy: —

## Scenariusz 2: Male biuro z harmonogramami

- Oczekiwanie: sredni wynik — braki w elastycznosci, raportowaniu, CO2
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: Sterowanie czasowe i podzial na strefy. Brak monitoringu energii, alarmow, CO2, elastycznosci.
- Uslugi obecne (11): H-1a=2, H-1c=2, H-2a=2, DHW-1b=2, C-1a=2, C-2a=2, V-1a=2, V-2d=1, L-1a=2, L-2=2, DE-1=2
- Mozliwe do rozbudowy: H-3, V-6

## Scenariusz 3: Sklep typu Decathlon (Loxone/BACnet/Modbus)

- Oczekiwanie: wynik dobry — braki w PV/magazynie/EV oraz pelnej elastycznosci
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: HVAC, oswietlenie, liczniki, dashboard, alarmy, raportowanie. Brak PV/magazynu/EV.
- Uslugi obecne (20): H-1a=3, H-1c=2, H-2a=2, H-3=3, DHW-1b=2, DHW-3=3, C-1a=3, C-2a=2, C-3=3, V-1a=3, V-1c=2, V-6=2, L-1a=3, L-2=3, DE-1=2, E-12=3, MC-3=3, MC-4=2, MC-13=3, MC-30=3
- Mozliwe do rozbudowy: E-2, H-4

## Scenariusz 4: Nowoczesny biurowiec z BMS (bez PV/EV/magazynu)

- Oczekiwanie: wynik wysoki — glowne braki w elastycznosci energetycznej (H-4/C-4)
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: Pelny BMS, wysokie poziomy HVAC/oswietlenia/rolet/monitoringu. Brak domeny elektrycznej (PV/magazyn/EV).
- Uslugi obecne (31): H-1a=4, H-1c=2, H-1d=3, H-2b=2, H-2d=4, H-3=4, H-4=2, DHW-1b=3, DHW-2b=3, DHW-3=4, C-1a=4, C-1d=3, C-2a=3, C-2b=4, C-3=4, C-4=2, V-1a=4, V-1c=3, V-2d=3, V-3=2, V-6=3, L-1a=3, L-2=4, DE-1=4, DE-2=2, DE-4=4, MC-3=3, MC-4=3, MC-9=2, MC-13=3, MC-30=3
- Mozliwe do rozbudowy: E-2, E-3, EV-15

## Scenariusz 5: Budynek z PV i EV, ale bez magazynu energii

- Oczekiwanie: rekomendacje powinny wskazac magazyn energii (E-3) i optymalizacje autokonsumpcji
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: PV monitorowane, ladowarki EV obecne. Brak magazynu energii (E-3) i slaba autokonsumpcja (E-4).
- Uslugi obecne (18): H-1a=2, H-1c=2, H-2a=2, H-3=2, C-1a=2, C-2a=2, V-1a=2, V-6=2, L-1a=2, L-2=2, DE-1=2, E-2=4, E-4=1, E-12=2, EV-15=2, EV-17=2, MC-3=2, MC-13=2
- Mozliwe do rozbudowy: E-3

## Scenariusz 6: Budynek z dobrym HVAC, ale slabym monitoringiem energii

- Oczekiwanie: rekomendacje na gorze powinny dotyczyc raportowania/pomiaru energii, nie HVAC
- Typ budynku: `non_residential`, strefa: `west_europe`
- Uwagi: HVAC na wysokich poziomach, ale raportowanie i pomiar energii szczatkowe (H-3/C-3/E-12/MC-13/MC-4 niskie).
- Uslugi obecne (21): H-1a=4, H-1c=2, H-2b=3, H-2d=3, H-3=1, DHW-1b=3, DHW-3=1, C-1a=4, C-2a=3, C-3=1, V-1a=4, V-1c=3, V-2d=3, V-6=2, L-1a=3, L-2=4, DE-1=3, E-12=1, MC-3=2, MC-4=1, MC-13=1
- Mozliwe do rozbudowy: —
