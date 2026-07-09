# SRI Optimization Model

> Warstwa **pomocnicza (advisory)** nad Recommendation Engine. Uklada najlepsza kolejnosc modernizacji. Nie zmienia punktacji SRI. Bez UI, ofert, kosztow i ROI.

- Wygenerowano: `2026-07-09T15:51:19.328698+00:00`
- Wersja: `1.0.0`

## Pytania, na ktore odpowiada

- ktore dzialania wykonac jako pierwsze,
- ktore daja najwiekszy wzrost SRI,
- ktore odblokowuja kolejne funkcje,
- ktore poprawiaja wiele domen naraz,
- ktore sa warunkiem dla innych rekomendacji,
- ktore mozna zgrupowac w jeden etap,

## Czynniki uwzgledniane (9)

1. Expected SRI Gain (marginalny przyrost SRI z silnika)
2. Liczba domen, na ktore wplywa rekomendacja
3. Liczba impact criteria poprawianych przez rekomendacje
4. Zaleznosci i blokery (z Dependency Engine)
5. Kolejnosc techniczna wdrozenia (etap wymaganych capability)
6. Latwosc wdrozenia (udzial funkcji programowych vs sprzetowych)
7. Ryzyko wdrozenia (low/medium/high wg charakteru capability)
8. Czy rekomendacja odblokowuje inne rekomendacje (liczba uslug korzystajacych z tej funkcji)
9. Czy rekomendacje mozna polaczyc w jeden pakiet (reguly grupowania)

## Logika etapowania (5 etapow)

### Etap 1: Szybkie wygrane / niski prog wejscia

- Konfiguracja i oprogramowanie bez nowego sprzetu: harmonogramy, centralna automatyka, wizualizacja, historia, alarmy, zdalny dostep.
- Prog wejscia: brak inwestycji sprzetowej, niskie ryzyko, szybki efekt
- Typowe ryzyko: low

### Etap 2: Fundament techniczny

- Czujniki, liczniki, komunikacja cyfrowa i integracja z BMS oraz sterowanie strefowe. Warstwa danych, ktora odblokowuje wyzsze poziomy w wielu uslugach.
- Prog wejscia: montaz czujnikow/licznikow/magistrali; fundament pod dalsze etapy
- Typowe ryzyko: low-medium

### Etap 3: Zaawansowana automatyka

- Sterowanie wg zapotrzebowania, napedy o zmiennej predkosci, modulacja zrodel, kaskady, odzysk/free-cooling, sterowanie oslonami, wykrywanie usterek (FDD).
- Prog wejscia: wymaga fundamentu z etapu 2 (dane + integracja)
- Typowe ryzyko: medium

### Etap 4: Elastycznosc energetyczna / PV / magazyn / EV

- Reakcja na sygnaly sieci/taryf, PV, magazyny ciepla/energii, autokonsumpcja, pomiar dwukierunkowy, ladowanie EV, mikrosiec.
- Prog wejscia: inwestycje kapitalowe i prace elektryczne; wysoki potencjal elastycznosci
- Typowe ryzyko: high

### Etap 5: Predykcja, AI, optymalizacja

- Sterowanie predykcyjne i optymalizacja z wyprzedzeniem (pogoda, oblozenie, ceny). Szczyt dojrzalosci — wymaga danych i dojrzalej automatyki.
- Prog wejscia: wymaga danych historycznych i dzialajacej automatyki z etapow 2-4
- Typowe ryzyko: medium

## Model postepu (kumulatywny)

Kazda capability ma przypisany etap. Usluga awansuje do najwyzszego FL, dla ktorego **wszystkie** wymagane capability naleza do etapow ≤ k. Po kazdym etapie liczony jest realny SRI silnikiem (z renormalizacja wag domen), wiec przyrost po etapie jest zgodny z metodologia.

## Ryzyko i odblokowania

- **Ryzyko** capability: `high` gdy wymaga obecnosci fizycznej urzadzenia (montaz/inwestycja), `medium` dla zaawansowanej automatyki/AI, `low` dla konfiguracji/integracji programowej. Ryzyko rekomendacji = maksimum po dodawanych capability.
- **Odblokowania**: capability wspoldzielona przez wiele uslug (np. `bms_integration`, `energy_metering`, `occupancy_detection`) wdrozona raz podnosi pulap wielu uslug — premiowana w etapie fundamentu.
