# SRI Audit Input Requirements

> Jakie dane i dowody nalezy zebrac w audycie, aby potwierdzic zaleznosci. To jeszcze **nie** sa pytania audytowe — to katalog wymaganych danych wejsciowych.

- Wygenerowano: `2026-07-08T20:58:16.846988+00:00`

## Tryby weryfikacji

- `automatic` — system moze potwierdzic z danych BMS/platformy,
- `assisted` — dane + potwierdzenie audytora,
- `manual` — obecnosc fizyczna / zdjecie / dokument (ogledziny).

Jesli brak danych wejsciowych lub dowodu — wynik oznaczyc jako `needs_verification` (`uncertain`), a nie zakladac spelnienia.

## Wymagane dane wejsciowe per capability

### actuation

#### `automated_switching_actuation` — Automatyczne zalaczanie/wylaczanie

- Dotyczy uslug: **2** (L-1a, L-2)
- Tryb weryfikacji: **assisted**
- Dowody: schemat sterowania, zdjecie sterownikow/przekaznikow
- Logika weryfikacji: Sprawdz elementy wykonawcze zalaczania/wylaczania.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `dimmable_lighting` — Oprawy scieramialne (dimming)

- Dotyczy uslug: **1** (L-2)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat DALI, lista opraw, zdjecie instalacji
- Logika weryfikacji: Sprawdz obecnosc opraw scieramialnych i regulacje plynna.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `ev_charging_point` — Punkt ladowania EV

- Dotyczy uslug: **1** (EV-15)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR stacji, zdjecie, schemat przylacza
- Logika weryfikacji: Sprawdz obecnosc, liczbe i moc punktow ladowania.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `shading_actuation` — Napedy zacienienia/rolet

- Dotyczy uslug: **1** (DE-1)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat sterowania oslonami, zdjecie napedow, DTR
- Logika weryfikacji: Sprawdz obecnosc napedow oslon i ich sterowanie.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `window_actuation` — Napedy okien/klap

- Dotyczy uslug: **1** (DE-2)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat napedow okien, zdjecie silownikow, DTR
- Logika weryfikacji: Sprawdz obecnosc napedow okien/klap i ich sterowanie.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### communication

#### `bms_integration` — Integracja z BMS/BACS

- Dotyczy uslug: **12** (C-1a, C-1f, DE-1, DE-2, E-4, H-1a, H-2a, MC-13, MC-30, MC-9, V-1a, V-1c)
- Tryb weryfikacji: **assisted**
- Dowody: architektura BMS, zrzut ekranu z punktami, lista integracji
- Logika weryfikacji: Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `charging_connectivity` — Laczonosc ladowania (OCPP/backend)

- Dotyczy uslug: **1** (EV-17)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja OCPP/backendu, raporty sesji
- Logika weryfikacji: Sprawdz laczonosc stacji i integracje z backendem.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `digital_communication` — Komunikacja cyfrowa sterownikow

- Dotyczy uslug: **10** (C-1a, C-1d, H-1a, H-1d, L-1a, L-2, MC-30, MC-9, V-1a, V-1c)
- Tryb weryfikacji: **assisted**
- Dowody: schemat magistrali (KNX/BACnet/Modbus), lista urzadzen na magistrali
- Logika weryfikacji: Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `remote_access` — Zdalny dostep

- Dotyczy uslug: **2** (EV-17, MC-4)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja dostepu zdalnego, zrzut portalu/aplikacji
- Logika weryfikacji: Sprawdz mozliwosc bezpiecznego zdalnego dostepu do systemu.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### control

#### `central_automatic_control` — Centralne sterowanie automatyczne

- Dotyczy uslug: **4** (C-1a, C-1b, H-1a, H-1b)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja sterownika/BMS, odczyt z BMS
- Logika weryfikacji: Sprawdz obecnosc automatycznej regulacji zamiast sterowania recznego.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `demand_based_control` — Sterowanie wg zapotrzebowania

- Dotyczy uslug: **16** (C-1c, C-1d, C-1g, C-2a, DHW-1a, DHW-1b, DHW-1d, H-1b, H-1c, H-1d, H-1f, H-2a, H-2b, V-1a, V-1c, V-2d)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja logiki w BMS, trendy nastaw vs zapotrzebowanie
- Logika weryfikacji: Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `free_cooling` — Free-cooling

- Dotyczy uslug: **3** (C-2a, V-2c, V-3)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja economizera, trendy przepustnic/temperatur
- Logika weryfikacji: Sprawdz logike free-coolingu i jej realne dzialanie.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `heat_recovery_control` — Sterowanie odzyskiem ciepla (by-pass)

- Dotyczy uslug: **1** (V-2c)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR centrali z odzyskiem, konfiguracja by-passu, trendy
- Logika weryfikacji: Sprawdz obecnosc odzysku, by-passu i logiki ochrony.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `interlock_control` — Blokada/koordynacja trybow (interlock)

- Dotyczy uslug: **1** (C-1f)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja dead-band/interlock, trendy trybow H/C
- Logika weryfikacji: Sprawdz martwa strefe i brak jednoczesnej pracy grzanie/chlodzenie.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `modulating_generator` — Modulacja mocy zrodla

- Dotyczy uslug: **4** (C-2a, E-5, H-2a, H-2b)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR/tabliczka zrodla, trendy modulacji, zdjecie instalacji
- Logika weryfikacji: Sprawdz zdolnosc modulacji mocy i jej wykorzystanie.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `predictive_control` — Sterowanie predykcyjne / optymalizacja

- Dotyczy uslug: **27** (C-1b, C-2a, C-2b, C-3, C-4, DE-1, DE-2, DE-4, DHW-1d, DHW-2b, DHW-3, E-11, E-12, E-2, E-3, E-4, E-8, H-1b, H-2b, H-2d, H-3, H-4, MC-29, MC-3, MC-30, V-2d, V-3)
- Tryb weryfikacji: **assisted**
- Dowody: opis logiki optymalizacji, konfiguracja BMS/platformy, trendy
- Logika weryfikacji: Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `scheduling` — Harmonogramy czasowe

- Dotyczy uslug: **9** (C-1g, C-4, DHW-1a, DHW-1b, EV-15, H-1f, H-4, MC-3, V-1a)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja harmonogramow w BMS, zrzut ekranu
- Logika weryfikacji: Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `sequencing_controller` — Sterownik kaskady/sekwencji zrodel

- Dotyczy uslug: **3** (C-2b, DHW-2b, H-2d)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja kaskady w BMS, trendy udzialu zrodel
- Logika weryfikacji: Sprawdz logike sekwencjonowania i kryteria przelaczania zrodel.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `sun_position_tracking` — Sledzenie pozycji slonca

- Dotyczy uslug: **1** (DE-1)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja logiki pozycji slonca, trendy pozycji oslon
- Logika weryfikacji: Sprawdz logike wg azymutu/wysokosci slonca.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `variable_speed_drive` — Naped o zmiennej predkosci (falownik)

- Dotyczy uslug: **3** (C-1d, H-1d, V-1c)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR pomp/wentylatorow, trendy predkosci/mocy, zdjecie falownika
- Logika weryfikacji: Sprawdz obecnosc falownikow i tryb regulacji (nie stala predkosc).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `zonal_control` — Sterowanie strefowe / indywidualne

- Dotyczy uslug: **8** (C-1a, C-1b, DE-1, H-1a, H-1b, L-1a, L-2, MC-29)
- Tryb weryfikacji: **assisted**
- Dowody: nastawy per strefa w BMS, schemat stref, zdjecia sterownikow
- Logika weryfikacji: Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### flexibility

#### `electrical_storage` — Magazyn energii elektrycznej

- Dotyczy uslug: **3** (E-11, E-3, E-8)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR magazynu, konfiguracja EMS, zdjecie instalacji
- Logika weryfikacji: Sprawdz obecnosc magazynu energii i strategie sterowania.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `grid_signal_interface` — Interfejs sygnalow sieci/taryf

- Dotyczy uslug: **19** (C-1g, C-2b, C-4, DHW-1a, DHW-1b, DHW-2b, E-3, E-5, E-8, EV-15, EV-16, H-1f, H-2b, H-2d, H-4, MC-25, MC-28, MC-29, MC-30)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja taryf/OpenADR/SG-Ready, trendy poboru vs sygnaly
- Logika weryfikacji: Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `load_balancing` — Zarzadzanie moca ladowania (load balancing)

- Dotyczy uslug: **1** (EV-15)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja load balancing/OCPP, trendy mocy vs limit przylacza
- Logika weryfikacji: Sprawdz dzialanie load balancingu wzgledem mocy przylacza.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `local_generation` — Lokalna generacja (PV/CHP)

- Dotyczy uslug: **2** (E-4, E-5)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: DTR instalacji PV/CHP, zdjecie, schemat elektryczny
- Logika weryfikacji: Sprawdz obecnosc i moc lokalnej generacji.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `microgrid_controller` — Kontroler mikrosieci / praca wyspowa

- Dotyczy uslug: **1** (E-8)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat microgrid/SZR, konfiguracja kontrolera, testy przelaczania
- Logika weryfikacji: Sprawdz zdolnosc pracy wyspowej i koordynacje zrodel.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `self_consumption_optimization` — Optymalizacja autokonsumpcji

- Dotyczy uslug: **4** (DHW-1a, E-3, E-4, EV-15)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja EMS/priorytetow, trendy autokonsumpcji
- Logika weryfikacji: Sprawdz reakcje odbiornikow na nadwyzke produkcji.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `solar_thermal_collector` — Kolektory sloneczne (solar thermal)

- Dotyczy uslug: **1** (DHW-1d)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat instalacji solarnej, zdjecie kolektorow, DTR
- Logika weryfikacji: Sprawdz obecnosc kolektorow i logike priorytetu solarnego.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `thermal_storage` — Magazyn ciepla/chlodu (bufor/TES)

- Dotyczy uslug: **6** (C-1g, C-4, E-5, H-1f, H-2b, H-4)
- Tryb weryfikacji: **manual**  ⚠ wymaga recznej weryfikacji
- Dowody: schemat hydrauliczny z buforem, zdjecie zbiornika, DTR
- Logika weryfikacji: Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### metering

#### `bidirectional_metering` — Pomiar dwukierunkowy

- Dotyczy uslug: **6** (C-4, E-3, EV-16, H-4, MC-25, MC-28)
- Tryb weryfikacji: **assisted**
- Dowody: DTR/tabliczka licznika, odczyt z systemu, umowa dystrybucyjna
- Logika weryfikacji: Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `energy_metering` — Pomiar energii/ciepla/chlodu

- Dotyczy uslug: **8** (C-2b, C-3, DHW-2b, DHW-3, E-12, H-2d, H-3, MC-13)
- Tryb weryfikacji: **assisted**
- Dowody: lista licznikow, odczyt z BMS, zdjecie licznikow
- Logika weryfikacji: Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `pv_monitoring` — Monitoring produkcji PV/OZE

- Dotyczy uslug: **1** (E-2)
- Tryb weryfikacji: **assisted**
- Dowody: monitoring falownikow, dashboard produkcji, lista falownikow
- Logika weryfikacji: Sprawdz monitoring produkcji (najlepiej per string/falownik).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `submetering` — Podlicznikowanie (submetering)

- Dotyczy uslug: **1** (E-12)
- Tryb weryfikacji: **assisted**
- Dowody: schemat opomiarowania obwodow, lista podlicznikow
- Logika weryfikacji: Sprawdz zakres submeteringu kluczowych odbiorow.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### reporting

#### `actuator_feedback` — Informacja zwrotna z napedow

- Dotyczy uslug: **1** (DE-4)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja informacji zwrotnej, trendy pozycji
- Logika weryfikacji: Sprawdz, czy napedy zwracaja pozycje/stan do systemu.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `alarms` — Alarmy i powiadomienia

- Dotyczy uslug: **10** (C-3, DE-4, DHW-3, E-11, E-12, E-2, H-3, MC-13, MC-4, V-6)
- Tryb weryfikacji: **automatic**
- Dowody: lista alarmow, konfiguracja powiadomien
- Logika weryfikacji: Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `data_logging` — Rejestracja i historia danych (trendy)

- Dotyczy uslug: **11** (C-3, DE-4, DHW-3, E-11, E-12, E-2, H-3, MC-13, MC-28, MC-29, V-6)
- Tryb weryfikacji: **automatic**
- Dowody: eksport trendow, konfiguracja historiana
- Logika weryfikacji: Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `fault_detection` — Wykrywanie usterek (FDD)

- Dotyczy uslug: **6** (C-3, DE-4, DHW-3, H-3, MC-13, MC-4)
- Tryb weryfikacji: **assisted**
- Dowody: lista regul FDD, raporty wykrytych usterek
- Logika weryfikacji: Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `reporting_platform` — Platforma raportowania/wizualizacji

- Dotyczy uslug: **13** (C-3, DE-4, DHW-3, E-11, E-12, E-2, EV-17, H-3, MC-13, MC-28, MC-30, MC-4, V-6)
- Tryb weryfikacji: **automatic**
- Dowody: zrzut dashboardu, dostep do platformy
- Logika weryfikacji: Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### safety

#### `dsm_override` — Nadrzedne sterowanie DSM (override)

- Dotyczy uslug: **1** (MC-29)
- Tryb weryfikacji: **assisted**
- Dowody: konfiguracja override/priorytetow, logi override
- Logika weryfikacji: Sprawdz mozliwosc i granularnosc override oraz rejestracje.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

### sensing

#### `co2_measurement` — Pomiar CO2 / jakosci powietrza

- Dotyczy uslug: **2** (V-1a, V-6)
- Tryb weryfikacji: **assisted**
- Dowody: odczyt z BMS, lista czujnikow CO2, certyfikat/kalibracja
- Logika weryfikacji: Sprawdz obecnosc czujnikow CO2 w reprezentatywnych strefach i ich dryft.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `daylight_measurement` — Pomiar natezenia swiatla

- Dotyczy uslug: **1** (L-2)
- Tryb weryfikacji: **assisted**
- Dowody: odczyt z systemu oswietlenia, lista czujnikow luksowych
- Logika weryfikacji: Sprawdz czujniki luksowe w strefach przyokiennych i ich kalibracje.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `humidity_measurement` — Pomiar wilgotnosci

- Dotyczy uslug: **2** (C-1b, V-3)
- Tryb weryfikacji: **assisted**
- Dowody: odczyt z BMS, lista czujnikow
- Logika weryfikacji: Sprawdz punkty pomiaru wilgotnosci i ich wykorzystanie w logice.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `occupancy_detection` — Detekcja obecnosci

- Dotyczy uslug: **7** (C-1a, H-1a, L-1a, MC-3, MC-30, MC-9, V-1a)
- Tryb weryfikacji: **assisted**
- Dowody: odczyt z BMS, lista czujnikow PIR/obecnosci, zdjecie instalacji
- Logika weryfikacji: Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `temperature_measurement` — Pomiar temperatury

- Dotyczy uslug: **17** (C-1a, C-1b, C-1c, C-1f, C-1g, DE-1, DHW-1a, DHW-1b, DHW-1d, H-1a, H-1b, H-1c, H-1f, H-2b, V-2c, V-2d, V-3)
- Tryb weryfikacji: **assisted**
- Dowody: odczyt z BMS, lista czujnikow, zdjecie instalacji
- Logika weryfikacji: Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `weather_data` — Dane pogodowe / prognoza

- Dotyczy uslug: **13** (C-1b, C-1c, C-2a, DE-1, DHW-1d, H-1b, H-1c, H-2a, H-2b, H-2d, MC-3, MC-30, V-2d)
- Tryb weryfikacji: **automatic**
- Dowody: konfiguracja stacji pogodowej/feedu, odczyt z BMS
- Logika weryfikacji: Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

#### `window_contact` — Detekcja otwarcia okna

- Dotyczy uslug: **1** (DE-2)
- Tryb weryfikacji: **assisted**
- Dowody: schemat kontaktronow, odczyt stanu okien, zdjecie
- Logika weryfikacji: Sprawdz detekcje otwarcia okien i powiazanie z HVAC.
- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.

## Minimalny zestaw danych miedzydomenowych

> Zebranie tych funkcji raz obsluguje wiele domen jednoczesnie.

| Czynnik | Capability | Domeny |
|---|---|---|
| Obecnosc uzytkownikow | `occupancy_detection` | Ogrzewanie, Chlodzenie, Wentylacja, Oswietlenie, Monitoring i sterowanie |
| Pogoda / prognoza | `weather_data` | Ogrzewanie, Chlodzenie, Wentylacja, Dynamiczna obudowa budynku, Cieppla woda uzytkowa |
| PV i magazyn energii | `self_consumption_optimization` | Elektrycznosc, Ladowanie pojazdow elektrycznych, Ogrzewanie, Chlodzenie, Cieppla woda uzytkowa |
| Sygnaly sieci / taryfy | `grid_signal_interface` | Elektrycznosc, Ladowanie pojazdow elektrycznych, Ogrzewanie, Chlodzenie, Monitoring i sterowanie |
| Dane pomiarowe energii | `energy_metering` | Ogrzewanie, Chlodzenie, Cieppla woda uzytkowa, Elektrycznosc, Monitoring i sterowanie |
| Integracja cyfrowa / BMS | `bms_integration` | Ogrzewanie, Chlodzenie, Wentylacja, Oswietlenie, Dynamiczna obudowa budynku, Monitoring i sterowanie |
