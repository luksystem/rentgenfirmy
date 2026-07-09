# SRI Priority & Ranking Engine

> Algorytm priorytetu i kolejnosci wdrazania (advisory). Nie zmienia punktacji SRI.

- Wygenerowano: `2026-07-09T15:51:18.682892+00:00`
- Wersja: `1.0.0`

## 1. Priority (Critical / High / Medium / Low)

Znormalizowany wynik priorytetu:

```
priority = 0.50*gain + 0.30*leverage + 0.20*domains
```
gdzie skladniki (min-max po 54 uslugach):
- `gain` — Expected SRI Gain (potencjal wyniku),
- `leverage` — liczba innych uslug korzystajacych z tych samych funkcji,
- `domains` — liczba domen objetych funkcjami uslugi.

Progi:
- **Critical**: score ≥ 0.60
- **High**: score ≥ 0.38
- **Medium**: score ≥ 0.20
- **Low**: score ≥ 0.00

Rozklad: Critical=10, High=28, Medium=9, Low=7

## 2. Recommendation Ranking (co wdrazac najpierw)

```
rank_score = 0.30*expected_gain + 0.15*energy_potential + 0.15*ease + 0.12*service_leverage + 0.10*domains + 0.10*prereq_readiness + 0.08*criteria
```
Skladniki (min-max po 54 uslugach):
- `expected_gain` — oczekiwany przyrost SRI,
- `energy_potential` — udzial kryteriow energetycznych (EE + elastycznosc),
- `ease` — latwosc wdrozenia (1 − udzial funkcji wymagajacych sprzetu fizycznego),
- `service_leverage` — liczba uslug wspoldzielacych funkcje,
- `domains` — liczba domen,
- `prereq_readiness` — plytkosc prerekwizytow (im mniej/nizej, tym wyzej),
- `criteria` — liczba Impact Criteria poprawianych przez usluge.

## 3. Pelny ranking 54 uslug

| # | Usluga | Nazwa | Domena | Priorytet | Rank score | Exp. Gain | Latwosc |
|---|---|---|---|---|---|---|---|
| 1 | MC-3 | Zarzadzanie czasem pracy instalacji (harmonogramy) | Monitoring i sterowanie | Critical | 0.823 | 4.553% | 1.00 |
| 2 | H-4 | Elastycznosc ogrzewania i wspolpraca z siecia | Ogrzewanie | Critical | 0.806 | 5.020% | 0.73 |
| 3 | H-2d | Kaskada / sekwencja wielu zrodel ciepla | Ogrzewanie | Critical | 0.757 | 4.426% | 1.00 |
| 4 | H-2b | Sterowanie pompa ciepla | Ogrzewanie | Critical | 0.721 | 4.415% | 0.62 |
| 5 | H-1f | Magazyn ciepla (bufor) dla ogrzewania | Ogrzewanie | Critical | 0.614 | 2.951% | 0.73 |
| 6 | H-1b | Sterowanie ogrzewaniem plaszczyznowym TABS | Ogrzewanie | Critical | 0.611 | 2.746% | 1.00 |
| 7 | H-3 | Raportowanie pracy systemu grzewczego | Ogrzewanie | Critical | 0.602 | 4.203% | 1.00 |
| 8 | MC-29 | Nadrzedne sterowanie DSM (override) | Monitoring i sterowanie | Critical | 0.582 | 2.079% | 1.00 |
| 9 | V-6 | Raportowanie jakosci powietrza (IAQ) | Wentylacja | High | 0.580 | 4.128% | 1.00 |
| 10 | MC-25 | Integracja ze smart grid | Monitoring i sterowanie | Medium | 0.575 | 2.737% | 1.00 |
| 11 | MC-28 | Raportowanie zarzadzania popytem (DSM) | Monitoring i sterowanie | High | 0.573 | 2.340% | 1.00 |
| 12 | H-1a | Sterowanie ogrzewaniem w pomieszczeniach | Ogrzewanie | High | 0.549 | 2.741% | 1.00 |
| 13 | DHW-1b | Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | Ciepla woda uzytkowa | High | 0.548 | 1.680% | 1.00 |
| 14 | DHW-1a | Sterowanie ladowaniem zasobnika CWU (grzalka / pompa ciepla) | Ciepla woda uzytkowa | High | 0.530 | 1.680% | 1.00 |
| 15 | C-1b | Sterowanie chlodzeniem plaszczyznowym TABS | Chlodzenie | High | 0.527 | 1.651% | 1.00 |
| 16 | DHW-3 | Raportowanie pracy systemu CWU | Ciepla woda uzytkowa | High | 0.525 | 2.872% | 1.00 |
| 17 | DE-1 | Sterowanie zacienieniem / roletami | Dynamiczna obudowa budynku | Critical | 0.514 | 2.717% | 0.81 |
| 18 | C-4 | Elastycznosc chlodzenia i wspolpraca z siecia | Chlodzenie | High | 0.511 | 1.945% | 0.73 |
| 19 | MC-30 | Jedna platforma sterowania i optymalizacji budynku | Monitoring i sterowanie | Critical | 0.511 | 1.431% | 1.00 |
| 20 | MC-4 | Wykrywanie i diagnostyka usterek (FDD) | Monitoring i sterowanie | High | 0.507 | 3.009% | 1.00 |
| 21 | DHW-2b | Kaskada / sekwencja zrodel CWU | Ciepla woda uzytkowa | High | 0.506 | 1.581% | 1.00 |
| 22 | MC-13 | Centralne raportowanie pracy i zuzycia budynku | Monitoring i sterowanie | High | 0.491 | 2.175% | 1.00 |
| 23 | V-1a | Sterowanie strumieniem powietrza w pomieszczeniu | Wentylacja | High | 0.485 | 1.699% | 1.00 |
| 24 | V-3 | Free-cooling wentylacja mechaniczna | Wentylacja | High | 0.482 | 1.298% | 1.00 |
| 25 | C-2b | Kaskada / sekwencja zrodel chlodu | Chlodzenie | High | 0.461 | 1.107% | 1.00 |
| 26 | V-2d | Sterowanie temperatura nawiewu (centrala) | Wentylacja | High | 0.458 | 0.912% | 1.00 |
| 27 | MC-9 | Detekcja obecnosci dla wielu systemow | Monitoring i sterowanie | Medium | 0.455 | 1.676% | 1.00 |
| 28 | E-12 | Raportowanie zuzycia energii elektrycznej | Elektrycznosc | High | 0.454 | 1.468% | 1.00 |
| 29 | C-1a | Sterowanie chlodzeniem w pomieszczeniach | Chlodzenie | High | 0.453 | 1.469% | 1.00 |
| 30 | DHW-1d | Sterowanie CWU z kolektorem slonecznym i dogrzewaniem | Ciepla woda uzytkowa | High | 0.450 | 1.432% | 0.73 |
| 31 | DE-4 | Raportowanie pracy dynamicznej powloki budynku | Dynamiczna obudowa budynku | High | 0.446 | 1.925% | 1.00 |
| 32 | EV-17 | Informacja i laczonosc ladowania EV | Ladowanie pojazdow elektrycznych | Medium | 0.442 | 1.508% | 1.00 |
| 33 | C-3 | Raportowanie pracy systemu chlodzenia | Chlodzenie | High | 0.441 | 1.666% | 1.00 |
| 34 | E-2 | Raportowanie produkcji energii (PV/OZE) | Elektrycznosc | High | 0.438 | 1.072% | 1.00 |
| 35 | EV-16 | Bilansowanie sieci przez ladowanie EV | Ladowanie pojazdow elektrycznych | Medium | 0.438 | 1.528% | 1.00 |
| 36 | E-4 | Optymalizacja autokonsumpcji energii z PV | Elektrycznosc | High | 0.434 | 1.140% | 0.67 |
| 37 | C-2a | Sterowanie zrodlem chlodu (agregatem) | Chlodzenie | High | 0.432 | 1.318% | 0.73 |
| 38 | DE-2 | Sterowanie otwieraniem okien z HVAC | Dynamiczna obudowa budynku | High | 0.430 | 1.478% | 0.67 |
| 39 | L-2 | Sciemnianie oswietlenia wg swiatla dziennego | Oswietlenie | Medium | 0.427 | 3.098% | 0.73 |
| 40 | C-1g | Sterowanie magazynem chlodu (TES) | Chlodzenie | High | 0.404 | 0.738% | 0.73 |
| 41 | E-3 | Magazynowanie energii elektrycznej | Elektrycznosc | High | 0.402 | 1.140% | 0.73 |
| 42 | E-11 | Raportowanie pracy magazynu energii | Elektrycznosc | High | 0.398 | 1.072% | 0.73 |
| 43 | H-1c | Regulacja temperatury czynnika grzewczego | Ogrzewanie | Medium | 0.388 | 0.652% | 1.00 |
| 44 | E-8 | Wsparcie pracy (mikro)sieci | Elektrycznosc | High | 0.375 | 1.216% | 0.33 |
| 45 | L-1a | Sterowanie oswietleniem wg obecnosci | Oswietlenie | Low | 0.360 | 1.331% | 1.00 |
| 46 | C-1c | Regulacja temperatury wody lodowej | Chlodzenie | Low | 0.355 | 0.322% | 1.00 |
| 47 | H-2a | Sterowanie zrodlem ciepla (poza pompami ciepla) | Ogrzewanie | Medium | 0.344 | 0.688% | 0.67 |
| 48 | C-1f | Blokada jednoczesnego grzania i chlodzenia | Chlodzenie | Low | 0.338 | 0.169% | 1.00 |
| 49 | V-2c | Sterowanie odzyskiem ciepla (ochrona przed przegrzewem) | Wentylacja | Low | 0.314 | 1.132% | 0.56 |
| 50 | V-1c | Sterowanie wentylatorami centrali (przeplyw/cisnienie) | Wentylacja | Medium | 0.312 | 0.542% | 0.67 |
| 51 | E-5 | Sterowanie kogeneracja (CHP) | Elektrycznosc | Medium | 0.261 | 1.131% | 0.00 |
| 52 | H-1d | Sterowanie pompami obiegowymi ogrzewania | Ogrzewanie | Low | 0.244 | 0.466% | 0.56 |
| 53 | EV-15 | Infrastruktura i moc ladowania EV | Ladowanie pojazdow elektrycznych | Low | 0.227 | 0.417% | 0.73 |
| 54 | C-1d | Sterowanie pompami obiegowymi chlodzenia | Chlodzenie | Low | 0.211 | 0.112% | 0.56 |
