# SRI — Raport walidacji silnika (Validation Report)

Weryfikacja poprawnosci obliczen silnika SRI wzgledem metodologii KE.
Bez UI, bez formularzy — sprawdzana jest wylacznie logika liczenia.

## A. Niezmienniki katalogu (dane wejsciowe)

| Sprawdzenie | Wynik | Szczegoly |
|---|---|---|
| Suma wag domen W(d,ic) = 1 dla kazdego (typ, strefa, kryterium) | ✅ PASS | max odchylenie 1.00e-10, niepoprawnych zestawow: 0 / 70 |
| Suma wag kryteriow W_f(ic) = 1 dla kazdego typu budynku | ✅ PASS | max odchylenie 1.00e-10, niepoprawnych: 0 / 2 |
| Katalog zawiera 9 domen technicznych | ✅ PASS | domeny: 9 |
| Katalog zawiera 7 kryteriow oddzialywania | ✅ PASS | kryteria: 7 |

## B. Scenariusze — wyniki i checki

| # | Scenariusz | Wynik | Klasa | Status |
|---|---|---|---|---|
| 1 | Budynek praktycznie bez automatyki | 0.00% | G | policzony |
| 2 | Maly budynek biurowy | 44.29% | E | policzony |
| 3 | Nowoczesny biurowiec (BMS, BACnet, PV, magazyn, EV) | 93.54% | A | policzony |
| 4 | Sklep typu Decathlon (Loxone, BACnet, Modbus) | 73.96% | C | policzony |
| 5 | Szpital (pelne instalacje, monitoring, redundancja) | 91.71% | A | policzony |
| 6 | Budynek z blednymi danymi (test walidacji) | — | — | ✅ odrzucony (walidacja) |

### Scenariusz 1: Budynek praktycznie bez automatyki

| Sprawdzenie (gating) | Wynik | Szczegoly |
|---|---|---|
| Wynik w zakresie metodologii 0-100% | ✅ | 0.00% |
| Brak bledu zaokraglen (suma czlonow = wynik) | ✅ | |0.000000000000 - 0.000000000000| < 1e-09 |
| Suma wag W_f(ic) uzytych w wyniku = 1 | ✅ | 1.0000 |
| Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium) | ✅ | max odchylenie 0.00e+00 |
| Zaden stosunek achieved/maxposs nie przekracza 1 | ✅ | max ratio = 0.0000 |
| Wszystkie obecne domeny uwzglednione | ✅ | pominiete: brak |

Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):

- Kryteria z realnym potencjalem (maxposs>0): 6/7 — bez potencjalu: INFO
- Domeny obecne: 5/9: cooling, domestic_hot_water, heating, lighting, ventilation

**Wynik:** 0.00% → klasa **G** (oczekiwano: bardzo niski wynik (klasa F/G))

### Scenariusz 2: Maly budynek biurowy

| Sprawdzenie (gating) | Wynik | Szczegoly |
|---|---|---|
| Wynik w zakresie metodologii 0-100% | ✅ | 44.29% |
| Brak bledu zaokraglen (suma czlonow = wynik) | ✅ | |0.442913732766 - 0.442913732766| < 1e-09 |
| Suma wag W_f(ic) uzytych w wyniku = 1 | ✅ | 1.0000 |
| Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium) | ✅ | max odchylenie 1.11e-16 |
| Zaden stosunek achieved/maxposs nie przekracza 1 | ✅ | max ratio = 1.0000 |
| Wszystkie obecne domeny uwzglednione | ✅ | pominiete: brak |

Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):

- Kryteria z realnym potencjalem (maxposs>0): 6/7 — bez potencjalu: INFO
- Domeny obecne: 6/9: cooling, domestic_hot_water, dynamic_building_envelope, heating, lighting, ventilation

**Wynik:** 44.29% → klasa **E** (oczekiwano: sredni wynik (klasa E/D) — pulap ograniczony brakiem elastycznosci i raportowania)

### Scenariusz 3: Nowoczesny biurowiec (BMS, BACnet, PV, magazyn, EV)

| Sprawdzenie (gating) | Wynik | Szczegoly |
|---|---|---|
| Wynik w zakresie metodologii 0-100% | ✅ | 93.54% |
| Brak bledu zaokraglen (suma czlonow = wynik) | ✅ | |0.935365484190 - 0.935365484190| < 1e-09 |
| Suma wag W_f(ic) uzytych w wyniku = 1 | ✅ | 1.0000 |
| Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium) | ✅ | max odchylenie 0.00e+00 |
| Zaden stosunek achieved/maxposs nie przekracza 1 | ✅ | max ratio = 1.0000 |
| Wszystkie obecne domeny uwzglednione | ✅ | pominiete: brak |

Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):

- Kryteria z realnym potencjalem (maxposs>0): 7/7
- Domeny obecne: 9/9: cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation

**Wynik:** 93.54% → klasa **A** (oczekiwano: bardzo wysoki wynik (klasa A/B))

### Scenariusz 4: Sklep typu Decathlon (Loxone, BACnet, Modbus)

| Sprawdzenie (gating) | Wynik | Szczegoly |
|---|---|---|
| Wynik w zakresie metodologii 0-100% | ✅ | 73.96% |
| Brak bledu zaokraglen (suma czlonow = wynik) | ✅ | |0.739637467293 - 0.739637467293| < 1e-09 |
| Suma wag W_f(ic) uzytych w wyniku = 1 | ✅ | 1.0000 |
| Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium) | ✅ | max odchylenie 1.11e-16 |
| Zaden stosunek achieved/maxposs nie przekracza 1 | ✅ | max ratio = 1.0000 |
| Wszystkie obecne domeny uwzglednione | ✅ | pominiete: brak |

Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):

- Kryteria z realnym potencjalem (maxposs>0): 7/7
- Domeny obecne: 8/9: cooling, domestic_hot_water, dynamic_building_envelope, electricity, heating, lighting, monitoring_and_control, ventilation

**Wynik:** 73.96% → klasa **C** (oczekiwano: wynik dobry (klasa B/C) - bez EV i pelnej elastycznosci)

### Scenariusz 5: Szpital (pelne instalacje, monitoring, redundancja)

| Sprawdzenie (gating) | Wynik | Szczegoly |
|---|---|---|
| Wynik w zakresie metodologii 0-100% | ✅ | 91.71% |
| Brak bledu zaokraglen (suma czlonow = wynik) | ✅ | |0.917078994282 - 0.917078994282| < 1e-09 |
| Suma wag W_f(ic) uzytych w wyniku = 1 | ✅ | 1.0000 |
| Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium) | ✅ | max odchylenie 0.00e+00 |
| Zaden stosunek achieved/maxposs nie przekracza 1 | ✅ | max ratio = 1.0000 |
| Wszystkie obecne domeny uwzglednione | ✅ | pominiete: brak |

Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):

- Kryteria z realnym potencjalem (maxposs>0): 7/7
- Domeny obecne: 9/9: cooling, domestic_hot_water, dynamic_building_envelope, electric_vehicle_charging, electricity, heating, lighting, monitoring_and_control, ventilation

**Wynik:** 91.71% → klasa **A** (oczekiwano: bardzo wysoki wynik - wplyw wszystkich 9 domen)

### Scenariusz 6: Budynek z blednymi danymi (test walidacji)

**Oczekiwanie:** silnik zwraca bledy walidacji zamiast wyniku

Silnik wykryl **4 bledow** i nie policzyl wyniku (zgodnie z oczekiwaniem):

- ❌ H-1a: poziom 7 przekracza FLmax=4
- ❌ Nieznany kod uslugi (brak w katalogu): H-XX
- ❌ C-1a: poziom ujemny (-1) niedozwolony
- ❌ V-1a: poziom musi byc liczba calkowita (jest 2.5)

**Status walidacji:** ✅ PASS (oczekiwano bledow: tak; wykryto: tak)

## C. Pokrycie globalne (kompletnosc wykorzystania katalogu)

| Sprawdzenie | Wynik | Szczegoly |
|---|---|---|
| Zestaw scenariuszy uzywa wszystkich 9 domen | ✅ | 9/9 |
| Zestaw scenariuszy uzywa wszystkich 7 kryteriow (impact scores) | ✅ | 7/7 |

## D. Podsumowanie

- Niezmienniki katalogu: ✅ wszystkie PASS
- Scenariusze (gating + walidacja + pokrycie): ✅ wszystkie PASS

### Odpowiedzi na pytania walidacyjne

- **Czy wszystkie wagi sumuja sie do 1?** ✅ Tak — wagi domen (po renormalizacji) i wagi kryteriow W_f.
- **Czy wszystkie domeny uwzglednione?** ✅ Tak — kazda obecna domena wchodzi do co najmniej jednego kryterium; nieobecne sa pomijane z renormalizacja wag.
- **Czy wynik miesci sie w zakresie metodologii?** ✅ Tak — wszystkie wyniki w 0–100%.
- **Czy nie ma bledow zaokraglen?** ✅ Tak — suma czlonow = wynik z tolerancja < 1e-9.
- **Czy nie ma brakujacych uslug?** ✅ Scenariusze 1–5 uzywaja wylacznie kodow z katalogu; scenariusz 6 celowo zawiera bledy i jest odrzucany.
- **Czy wszystkie impact scores uzyte?** ✅ Tak — wszystkie 7 kryteriow ma wnoszace domeny w scenariuszach 1–5.

