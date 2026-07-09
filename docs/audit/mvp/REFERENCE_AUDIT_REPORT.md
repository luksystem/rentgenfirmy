# Referencyjny audyt SRI — raport (snapshot)

> Wygenerowane przez `store/SRI/mvp_reference_report.py` (parytet z runtime TS).
> Podgląd na żywo w aplikacji: `/audyt/przyklad`.

- Metodologia: `eu-sri-v4.5`
- Budynek: `non_residential` · Strefa: `north_europe`
- Usługi ocenione: 54 · Luki (level < FLmax): 52

## Wynik

**SRI: 59.25%** — klasa **D** (nr 4)

## Wynik per kryterium (SR)

| Kryterium | SR |
|---|---|
| Efektywność energetyczna | 72.2% |
| Utrzymanie i predykcja awarii | 45.8% |
| Komfort | 76.5% |
| Wygoda | 61.8% |
| Zdrowie i dostępność | 63.7% |
| Informacja dla użytkowników | 61.9% |
| Elastyczność energetyczna | 52.8% |

## Wynik per domena

| Domena | achieved | max | % |
|---|---|---|---|
| Chłodzenie | 40 | 68 | 59% |
| Ciepła woda użytkowa (CWU) | 15 | 34 | 44% |
| Dynamiczna powłoka budynku | 9 | 25 | 36% |
| Ładowanie pojazdów elektrycznych | 7 | 13 | 54% |
| Elektryczność | 24 | 44 | 55% |
| Ogrzewanie | 54 | 69 | 78% |
| Oświetlenie | 15 | 19 | 79% |
| Monitorowanie i sterowanie | 40 | 61 | 66% |
| Wentylacja | 32 | 46 | 70% |

## Rekomendacje (52)

| Usługa | Domena | Poziom → cel | Priorytet | Oczekiwany zysk |
|---|---|---|---|---|
| MC-3 — Zarzadzanie czasem pracy instalacji (harmonogramy) | Monitoring i sterowanie | 2 → 3 | Critical | 4.553% |
| H-2b — Sterowanie pompa ciepla | Ogrzewanie | 2 → 3 | Critical | 4.415% |
| H-4 — Elastycznosc ogrzewania i wspolpraca z siecia | Ogrzewanie | 3 → 4 | Critical | 5.020% |
| H-2d — Kaskada / sekwencja wielu zrodel ciepla | Ogrzewanie | 3 → 4 | Critical | 4.426% |
| H-3 — Raportowanie pracy systemu grzewczego | Ogrzewanie | 3 → 4 | Critical | 4.203% |
| H-1b — Sterowanie ogrzewaniem plaszczyznowym TABS | Ogrzewanie | 2 → 3 | Critical | 2.746% |
| DE-1 — Sterowanie zacienieniem / roletami | Dynamiczna obudowa budynku | 1 → 4 | Critical | 2.717% |
| MC-30 — Jedna platforma sterowania i optymalizacji budynku | Monitoring i sterowanie | 2 → 3 | Critical | 1.431% |
| H-1f — Magazyn ciepla (bufor) dla ogrzewania | Ogrzewanie | 2 → 3 | Critical | 2.951% |
| MC-29 — Nadrzedne sterowanie DSM (override) | Monitoring i sterowanie | 3 → 4 | Critical | 2.079% |
| V-6 — Raportowanie jakosci powietrza (IAQ) | Wentylacja | 2 → 3 | High | 4.128% |
| DHW-3 — Raportowanie pracy systemu CWU | Ciepla woda uzytkowa | 2 → 4 | High | 2.872% |
| H-1a — Sterowanie ogrzewaniem w pomieszczeniach | Ogrzewanie | 3 → 4 | High | 2.741% |
| C-4 — Elastycznosc chlodzenia i wspolpraca z siecia | Chlodzenie | 2 → 4 | High | 1.945% |
| C-1b — Sterowanie chlodzeniem plaszczyznowym TABS | Chlodzenie | 2 → 3 | High | 1.651% |
| DHW-1a — Sterowanie ladowaniem zasobnika CWU (grzalka / pompa ciepla) | Ciepla woda uzytkowa | 1 → 3 | High | 1.680% |
| MC-28 — Raportowanie zarzadzania popytem (DSM) | Monitoring i sterowanie | 1 → 2 | High | 2.340% |
| V-1a — Sterowanie strumieniem powietrza w pomieszczeniu | Wentylacja | 2 → 4 | High | 1.699% |
| DHW-1b — Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | Ciepla woda uzytkowa | 1 → 3 | High | 1.680% |
| DHW-2b — Kaskada / sekwencja zrodel CWU | Ciepla woda uzytkowa | 2 → 4 | High | 1.581% |
| DE-4 — Raportowanie pracy dynamicznej powloki budynku | Dynamiczna obudowa budynku | 1 → 4 | High | 1.925% |
| MC-13 — Centralne raportowanie pracy i zuzycia budynku | Monitoring i sterowanie | 2 → 3 | High | 2.175% |
| DHW-1d — Sterowanie CWU z kolektorem slonecznym i dogrzewaniem | Ciepla woda uzytkowa | 1 → 3 | High | 1.432% |
| C-3 — Raportowanie pracy systemu chlodzenia | Chlodzenie | 2 → 4 | High | 1.666% |
| MC-4 — Wykrywanie i diagnostyka usterek (FDD) | Monitoring i sterowanie | 2 → 3 | High | 3.009% |
| E-4 — Optymalizacja autokonsumpcji energii z PV | Elektrycznosc | 1 → 3 | High | 1.140% |
| E-8 — Wsparcie pracy (mikro)sieci | Elektrycznosc | 1 → 3 | High | 1.216% |
| C-2b — Kaskada / sekwencja zrodel chlodu | Chlodzenie | 2 → 4 | High | 1.107% |
| E-12 — Raportowanie zuzycia energii elektrycznej | Elektrycznosc | 2 → 4 | High | 1.468% |
| E-3 — Magazynowanie energii elektrycznej | Elektrycznosc | 2 → 4 | High | 1.140% |
| C-2a — Sterowanie zrodlem chlodu (agregatem) | Chlodzenie | 2 → 3 | High | 1.318% |
| C-1a — Sterowanie chlodzeniem w pomieszczeniach | Chlodzenie | 2 → 4 | High | 1.469% |
| DE-2 — Sterowanie otwieraniem okien z HVAC | Dynamiczna obudowa budynku | 1 → 3 | High | 1.478% |
| C-1g — Sterowanie magazynem chlodu (TES) | Chlodzenie | 2 → 3 | High | 0.738% |
| V-3 — Free-cooling wentylacja mechaniczna | Wentylacja | 2 → 3 | High | 1.298% |
| V-2d — Sterowanie temperatura nawiewu (centrala) | Wentylacja | 2 → 3 | High | 0.912% |
| E-2 — Raportowanie produkcji energii (PV/OZE) | Elektrycznosc | 2 → 4 | High | 1.072% |
| E-11 — Raportowanie pracy magazynu energii | Elektrycznosc | 2 → 4 | High | 1.072% |
| MC-25 — Integracja ze smart grid | Monitoring i sterowanie | 1 → 2 | Medium | 2.737% |
| L-2 — Sciemnianie oswietlenia wg swiatla dziennego | Oswietlenie | 3 → 4 | Medium | 3.098% |
| V-1c — Sterowanie wentylatorami centrali (przeplyw/cisnienie) | Wentylacja | 2 → 4 | Medium | 0.542% |
| EV-17 — Informacja i laczonosc ladowania EV | Ladowanie pojazdow elektrycznych | 1 → 2 | Medium | 1.508% |
| MC-9 — Detekcja obecnosci dla wielu systemow | Monitoring i sterowanie | 1 → 2 | Medium | 1.676% |
| EV-16 — Bilansowanie sieci przez ladowanie EV | Ladowanie pojazdow elektrycznych | 1 → 2 | Medium | 1.528% |
| E-5 — Sterowanie kogeneracja (CHP) | Elektrycznosc | 1 → 2 | Medium | 1.131% |
| EV-15 — Infrastruktura i moc ladowania EV | Ladowanie pojazdow elektrycznych | 1 → 4 | Low | 0.417% |
| C-1f — Blokada jednoczesnego grzania i chlodzenia | Chlodzenie | 1 → 2 | Low | 0.169% |
| L-1a — Sterowanie oswietleniem wg obecnosci | Oswietlenie | 2 → 3 | Low | 1.331% |
| C-1c — Regulacja temperatury wody lodowej | Chlodzenie | 1 → 2 | Low | 0.322% |
| H-1d — Sterowanie pompami obiegowymi ogrzewania | Ogrzewanie | 3 → 4 | Low | 0.466% |
| V-2c — Sterowanie odzyskiem ciepla (ochrona przed przegrzewem) | Wentylacja | 1 → 2 | Low | 1.132% |
| C-1d — Sterowanie pompami obiegowymi chlodzenia | Chlodzenie | 2 → 4 | Low | 0.112% |

## Roadmap modernizacji

### Etap 1: Szybkie wygrane / niski prog wejscia (35 działań)

_Konfiguracja i oprogramowanie bez nowego sprzetu: harmonogramy, centralna automatyka, wizualizacja, historia, alarmy, zdalny dostep._

- MC-3 — Zarzadzanie czasem pracy instalacji (harmonogramy) (Monitoring i sterowanie) · priorytet Critical
- H-2b — Sterowanie pompa ciepla (Ogrzewanie) · priorytet Critical
- H-4 — Elastycznosc ogrzewania i wspolpraca z siecia (Ogrzewanie) · priorytet Critical
- H-3 — Raportowanie pracy systemu grzewczego (Ogrzewanie) · priorytet Critical
- H-1b — Sterowanie ogrzewaniem plaszczyznowym TABS (Ogrzewanie) · priorytet Critical
- DE-1 — Sterowanie zacienieniem / roletami (Dynamiczna obudowa budynku) · priorytet Critical
- MC-30 — Jedna platforma sterowania i optymalizacji budynku (Monitoring i sterowanie) · priorytet Critical
- H-1f — Magazyn ciepla (bufor) dla ogrzewania (Ogrzewanie) · priorytet Critical
- MC-29 — Nadrzedne sterowanie DSM (override) (Monitoring i sterowanie) · priorytet Critical
- V-6 — Raportowanie jakosci powietrza (IAQ) (Wentylacja) · priorytet High
- DHW-3 — Raportowanie pracy systemu CWU (Ciepla woda uzytkowa) · priorytet High
- H-1a — Sterowanie ogrzewaniem w pomieszczeniach (Ogrzewanie) · priorytet High
- C-4 — Elastycznosc chlodzenia i wspolpraca z siecia (Chlodzenie) · priorytet High
- C-1b — Sterowanie chlodzeniem plaszczyznowym TABS (Chlodzenie) · priorytet High
- DHW-1a — Sterowanie ladowaniem zasobnika CWU (grzalka / pompa ciepla) (Ciepla woda uzytkowa) · priorytet High
- MC-28 — Raportowanie zarzadzania popytem (DSM) (Monitoring i sterowanie) · priorytet High
- V-1a — Sterowanie strumieniem powietrza w pomieszczeniu (Wentylacja) · priorytet High
- DHW-1b — Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) (Ciepla woda uzytkowa) · priorytet High
- DE-4 — Raportowanie pracy dynamicznej powloki budynku (Dynamiczna obudowa budynku) · priorytet High
- MC-13 — Centralne raportowanie pracy i zuzycia budynku (Monitoring i sterowanie) · priorytet High
- DHW-1d — Sterowanie CWU z kolektorem slonecznym i dogrzewaniem (Ciepla woda uzytkowa) · priorytet High
- C-3 — Raportowanie pracy systemu chlodzenia (Chlodzenie) · priorytet High
- MC-4 — Wykrywanie i diagnostyka usterek (FDD) (Monitoring i sterowanie) · priorytet High
- E-12 — Raportowanie zuzycia energii elektrycznej (Elektrycznosc) · priorytet High
- C-1a — Sterowanie chlodzeniem w pomieszczeniach (Chlodzenie) · priorytet High
- C-1g — Sterowanie magazynem chlodu (TES) (Chlodzenie) · priorytet High
- V-3 — Free-cooling wentylacja mechaniczna (Wentylacja) · priorytet High
- V-2d — Sterowanie temperatura nawiewu (centrala) (Wentylacja) · priorytet High
- E-2 — Raportowanie produkcji energii (PV/OZE) (Elektrycznosc) · priorytet High
- E-11 — Raportowanie pracy magazynu energii (Elektrycznosc) · priorytet High
- EV-17 — Informacja i laczonosc ladowania EV (Ladowanie pojazdow elektrycznych) · priorytet Medium
- EV-15 — Infrastruktura i moc ladowania EV (Ladowanie pojazdow elektrycznych) · priorytet Low
- C-1f — Blokada jednoczesnego grzania i chlodzenia (Chlodzenie) · priorytet Low
- C-1c — Regulacja temperatury wody lodowej (Chlodzenie) · priorytet Low
- V-2c — Sterowanie odzyskiem ciepla (ochrona przed przegrzewem) (Wentylacja) · priorytet Low

### Etap 2: Fundament techniczny (12 działań)

_Czujniki, liczniki, komunikacja cyfrowa i integracja z BMS oraz sterowanie strefowe. Warstwa danych, ktora odblokowuje wyzsze poziomy w wielu uslugach._

- H-2d — Kaskada / sekwencja wielu zrodel ciepla (Ogrzewanie) · priorytet Critical
- DHW-2b — Kaskada / sekwencja zrodel CWU (Ciepla woda uzytkowa) · priorytet High
- E-4 — Optymalizacja autokonsumpcji energii z PV (Elektrycznosc) · priorytet High
- C-2b — Kaskada / sekwencja zrodel chlodu (Chlodzenie) · priorytet High
- C-2a — Sterowanie zrodlem chlodu (agregatem) (Chlodzenie) · priorytet High
- DE-2 — Sterowanie otwieraniem okien z HVAC (Dynamiczna obudowa budynku) · priorytet High
- L-2 — Sciemnianie oswietlenia wg swiatla dziennego (Oswietlenie) · priorytet Medium
- V-1c — Sterowanie wentylatorami centrali (przeplyw/cisnienie) (Wentylacja) · priorytet Medium
- MC-9 — Detekcja obecnosci dla wielu systemow (Monitoring i sterowanie) · priorytet Medium
- L-1a — Sterowanie oswietleniem wg obecnosci (Oswietlenie) · priorytet Low
- H-1d — Sterowanie pompami obiegowymi ogrzewania (Ogrzewanie) · priorytet Low
- C-1d — Sterowanie pompami obiegowymi chlodzenia (Chlodzenie) · priorytet Low

### Etap 3: Zaawansowana automatyka (1 działań)

_Sterowanie wg zapotrzebowania, napedy o zmiennej predkosci, modulacja zrodel, kaskady, odzysk/free-cooling, sterowanie oslonami, wykrywanie usterek (FDD)._

- E-5 — Sterowanie kogeneracja (CHP) (Elektrycznosc) · priorytet Medium

### Etap 4: Elastycznosc energetyczna / PV / magazyn / EV (4 działań)

_Reakcja na sygnaly sieci/taryf, PV, magazyny ciepla/energii, autokonsumpcja, pomiar dwukierunkowy, ladowanie EV, mikrosiec._

- E-8 — Wsparcie pracy (mikro)sieci (Elektrycznosc) · priorytet High
- E-3 — Magazynowanie energii elektrycznej (Elektrycznosc) · priorytet High
- MC-25 — Integracja ze smart grid (Monitoring i sterowanie) · priorytet Medium
- EV-16 — Bilansowanie sieci przez ladowanie EV (Ladowanie pojazdow elektrycznych) · priorytet Medium

### Etap 5: Predykcja, AI, optymalizacja (0 działań)

_Sterowanie predykcyjne i optymalizacja z wyprzedzeniem (pogoda, oblozenie, ceny). Szczyt dojrzalosci — wymaga danych i dojrzalej automatyki._


