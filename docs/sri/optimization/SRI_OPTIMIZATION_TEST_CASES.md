# SRI Optimization — Test Cases

- Wygenerowano: `2026-07-09T15:51:19.328698+00:00`

Test roadmap engine na 3 scenariuszach. Dla kazdego: obecny SRI, etapy, przyrost po etapie, blokery i uzasadnienie kolejnosci.

## Scenariusz 1: Budynek bez automatyki

- Typ: `non_residential`, strefa: `west_europe`
- **Obecny SRI: 0.0% (klasa G)** → **po pelnej roadmapie: 91.67%**

**Wzrost SRI po etapach:**

| Etap | Nazwa | SRI po | Przyrost |
|---|---|---|---|
| 0 | stan obecny | 0.0% | — |
| 1 | Szybkie wygrane / niski prog wejscia | 12.92% | +12.92 pkt |
| 2 | Fundament techniczny | 45.4% | +32.48 pkt |
| 3 | Zaawansowana automatyka | 73.83% | +28.42 pkt |
| 4 | Elastycznosc energetyczna / PV / magazyn / EV | 78.21% | +4.38 pkt |
| 5 | Predykcja, AI, optymalizacja | 91.67% | +13.45 pkt |

### Etap 1: Szybkie wygrane / niski prog wejscia

SRI 0.0% → 12.92% (**+12.92 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 0→1 | low | 3 uslug | Harmonogramy czasowe, Pomiar temperatury |
| C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 0→1 | low | 2 uslug | Centralne sterowanie automatyczne, Pomiar temperatury |
| H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 0→1 | low | 2 uslug | Centralne sterowanie automatyczne, Pomiar temperatury |

_Funkcje cross-domain (wdroz raz):_ Centralne sterowanie automatyczne → C-1a, H-1a; Harmonogramy czasowe → DHW-1b; Pomiar temperatury → C-1a, DHW-1b, H-1a

_Pakiety po domenie:_ Chlodzenie: C-1a; Ciepla woda uzytkowa: DHW-1b; Ogrzewanie: H-1a

### Etap 2: Fundament techniczny

SRI 12.92% → 45.4% (**+32.48 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 1→4 | low | 4 uslug | Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci |
| H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 1→4 | low | 4 uslug | Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci |
| L-1a Sterowanie oswietleniem wg obecnosci | upgrade | 0→3 | low | 3 uslug | Detekcja obecnosci, Automatyczne zalaczanie/wylaczanie, Komunikacja cyfrowa sterownikow, Sterowanie strefowe / indywidualne |

_Funkcje cross-domain (wdroz raz):_ Detekcja obecnosci → C-1a, H-1a, L-1a; Integracja z BMS/BACS → C-1a, H-1a; Komunikacja cyfrowa sterownikow → C-1a, H-1a, L-1a; Sterowanie strefowe / indywidualne → C-1a, H-1a, L-1a

_Pakiety po domenie:_ Chlodzenie: C-1a; Ogrzewanie: H-1a; Oswietlenie: L-1a

### Etap 3: Zaawansowana automatyka

SRI 45.4% → 73.83% (**+28.42 pkt**). Blokery sprzetowe: Modulacja mocy zrodla.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 0→2 | high | 3 uslug | Modulacja mocy zrodla, Sterowanie wg zapotrzebowania |
| DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 1→2 | medium | 3 uslug | Sterowanie wg zapotrzebowania |
| H-2a Sterowanie zrodlem ciepla (poza pompami ciepla) | upgrade | 0→2 | high | 3 uslug | Modulacja mocy zrodla, Sterowanie wg zapotrzebowania |
| V-1a Sterowanie strumieniem powietrza w pomieszczeniu | upgrade | 0→4 | medium | 3 uslug | Sterowanie wg zapotrzebowania |

_Funkcje cross-domain (wdroz raz):_ Modulacja mocy zrodla → C-2a, H-2a; Sterowanie wg zapotrzebowania → C-2a, DHW-1b, H-2a, V-1a

_Pakiety po domenie:_ Chlodzenie: C-2a; Ciepla woda uzytkowa: DHW-1b; Ogrzewanie: H-2a; Wentylacja: V-1a

### Etap 4: Elastycznosc energetyczna / PV / magazyn / EV

SRI 73.83% → 78.21% (**+4.38 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 2→3 | medium | 0 uslug | Interfejs sygnalow sieci/taryf |

_Funkcje cross-domain (wdroz raz):_ Interfejs sygnalow sieci/taryf → DHW-1b

_Pakiety po domenie:_ Ciepla woda uzytkowa: DHW-1b

### Etap 5: Predykcja, AI, optymalizacja

SRI 78.21% → 91.67% (**+13.45 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 2→3 | medium | 0 uslug | Sterowanie predykcyjne / optymalizacja |

_Funkcje cross-domain (wdroz raz):_ Sterowanie predykcyjne / optymalizacja → C-2a

_Pakiety po domenie:_ Chlodzenie: C-2a

**Uzasadnienie kolejnosci:** etapy 1-2 dostarczaja efektow bez/niskim kosztem i budują warstwe danych, ktora odblokowuje etap 3; elastycznosc (etap 4) i predykcja (etap 5) wchodza dopiero po ustabilizowaniu automatyki i danych.

---

## Scenariusz 3: Sklep typu Decathlon (Loxone/BACnet/Modbus)

- Typ: `non_residential`, strefa: `west_europe`
- **Obecny SRI: 73.96% (klasa C)** → **po pelnej roadmapie: 100.0%**

**Wzrost SRI po etapach:**

| Etap | Nazwa | SRI po | Przyrost |
|---|---|---|---|
| 0 | stan obecny | 73.96% | — |
| 1 | Szybkie wygrane / niski prog wejscia | 73.96% | +0.0 pkt |
| 2 | Fundament techniczny | 77.68% | +3.71 pkt |
| 3 | Zaawansowana automatyka | 81.38% | +3.7 pkt |
| 4 | Elastycznosc energetyczna / PV / magazyn / EV | 84.05% | +2.67 pkt |
| 5 | Predykcja, AI, optymalizacja | 100.0% | +15.95 pkt |

### Etap 1: Szybkie wygrane / niski prog wejscia — brak akcji w tym budynku (+0)

### Etap 2: Fundament techniczny

SRI 73.96% → 77.68% (**+3.71 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| L-2 Sciemnianie oswietlenia wg swiatla dziennego | upgrade | 3→4 | low | 2 uslug | Komunikacja cyfrowa sterownikow |
| C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 3→4 | low | 1 uslug | Detekcja obecnosci |
| H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 3→4 | low | 1 uslug | Detekcja obecnosci |
| E-2 Raportowanie produkcji energii (PV/OZE) | expansion | 0→3 | low | 0 uslug | Monitoring produkcji PV/OZE |
| V-6 Raportowanie jakosci powietrza (IAQ) | upgrade | 2→3 | low | 0 uslug | — |

_Funkcje cross-domain (wdroz raz):_ Detekcja obecnosci → C-1a, H-1a; Komunikacja cyfrowa sterownikow → L-2

_Pakiety po domenie:_ Chlodzenie: C-1a; Elektrycznosc: E-2; Ogrzewanie: H-1a; Oswietlenie: L-2; Wentylacja: V-6

### Etap 3: Zaawansowana automatyka

SRI 77.68% → 81.38% (**+3.7 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| DE-1 Sterowanie zacienieniem / roletami | upgrade | 2→3 | medium | 0 uslug | Sledzenie pozycji slonca |
| MC-4 Wykrywanie i diagnostyka usterek (FDD) | upgrade | 2→3 | low | 0 uslug | — |
| V-1a Sterowanie strumieniem powietrza w pomieszczeniu | upgrade | 3→4 | low | 0 uslug | — |
| V-1c Sterowanie wentylatorami centrali (przeplyw/cisnienie) | upgrade | 2→4 | low | 0 uslug | — |

_Pakiety po domenie:_ Dynamiczna obudowa budynku: DE-1; Monitoring i sterowanie: MC-4; Wentylacja: V-1a, V-1c

### Etap 4: Elastycznosc energetyczna / PV / magazyn / EV

SRI 81.38% → 84.05% (**+2.67 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 2→3 | medium | 1 uslug | Interfejs sygnalow sieci/taryf |

_Funkcje cross-domain (wdroz raz):_ Interfejs sygnalow sieci/taryf → DHW-1b

_Pakiety po domenie:_ Ciepla woda uzytkowa: DHW-1b

### Etap 5: Predykcja, AI, optymalizacja

SRI 84.05% → 100.0% (**+15.95 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 2→3 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| C-3 Raportowanie pracy systemu chlodzenia | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| DE-1 Sterowanie zacienieniem / roletami | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| DHW-3 Raportowanie pracy systemu CWU | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| E-12 Raportowanie zuzycia energii elektrycznej | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| E-2 Raportowanie produkcji energii (PV/OZE) | expansion | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| H-3 Raportowanie pracy systemu grzewczego | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |

_Funkcje cross-domain (wdroz raz):_ Sterowanie predykcyjne / optymalizacja → C-2a, C-3, DE-1, DHW-3, E-12, E-2, H-3

_Pakiety po domenie:_ Chlodzenie: C-2a, C-3; Ciepla woda uzytkowa: DHW-3; Dynamiczna obudowa budynku: DE-1; Elektrycznosc: E-12, E-2; Ogrzewanie: H-3

**Uzasadnienie kolejnosci:** etapy 1-2 dostarczaja efektow bez/niskim kosztem i budują warstwe danych, ktora odblokowuje etap 3; elastycznosc (etap 4) i predykcja (etap 5) wchodza dopiero po ustabilizowaniu automatyki i danych.

---

## Scenariusz 4: Nowoczesny biurowiec z BMS (bez PV/EV/magazynu)

- Typ: `non_residential`, strefa: `west_europe`
- **Obecny SRI: 89.27% (klasa B)** → **po pelnej roadmapie: 100.0%**

**Wzrost SRI po etapach:**

| Etap | Nazwa | SRI po | Przyrost |
|---|---|---|---|
| 0 | stan obecny | 89.27% | — |
| 1 | Szybkie wygrane / niski prog wejscia | 89.27% | +0.0 pkt |
| 2 | Fundament techniczny | 89.27% | +0.0 pkt |
| 3 | Zaawansowana automatyka | 89.27% | +0.0 pkt |
| 4 | Elastycznosc energetyczna / PV / magazyn / EV | 89.32% | +0.05 pkt |
| 5 | Predykcja, AI, optymalizacja | 100.0% | +10.68 pkt |

### Etap 1: Szybkie wygrane / niski prog wejscia — brak akcji w tym budynku (+0)

### Etap 2: Fundament techniczny — brak akcji w tym budynku (+0)

### Etap 3: Zaawansowana automatyka

SRI 89.27% → 89.27% (**+0.0 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-1d Sterowanie pompami obiegowymi chlodzenia | upgrade | 3→4 | low | 0 uslug | — |
| H-1d Sterowanie pompami obiegowymi ogrzewania | upgrade | 3→4 | low | 0 uslug | — |
| V-1c Sterowanie wentylatorami centrali (przeplyw/cisnienie) | upgrade | 3→4 | low | 0 uslug | — |

_Pakiety po domenie:_ Chlodzenie: C-1d; Ogrzewanie: H-1d; Wentylacja: V-1c

### Etap 4: Elastycznosc energetyczna / PV / magazyn / EV

SRI 89.27% → 89.32% (**+0.05 pkt**). Blokery sprzetowe: Punkt ladowania EV.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| EV-15 Infrastruktura i moc ladowania EV | expansion | 0→4 | high | 2 uslug | Punkt ladowania EV, Zarzadzanie moca ladowania (load balancing), Interfejs sygnalow sieci/taryf, Optymalizacja autokonsumpcji |

_Funkcje cross-domain (wdroz raz):_ Interfejs sygnalow sieci/taryf → EV-15; Optymalizacja autokonsumpcji → EV-15

_Pakiety po domenie:_ Ladowanie pojazdow elektrycznych: EV-15

### Etap 5: Predykcja, AI, optymalizacja

SRI 89.32% → 100.0% (**+10.68 pkt**). Blokery sprzetowe: brak.

| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |
|---|---|---|---|---|---|
| C-4 Elastycznosc chlodzenia i wspolpraca z siecia | upgrade | 2→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| DE-2 Sterowanie otwieraniem okien z HVAC | upgrade | 2→3 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| DHW-2b Kaskada / sekwencja zrodel CWU | upgrade | 3→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| H-2b Sterowanie pompa ciepla | upgrade | 2→3 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| H-4 Elastycznosc ogrzewania i wspolpraca z siecia | upgrade | 2→4 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |
| V-3 Free-cooling wentylacja mechaniczna | upgrade | 2→3 | medium | 7 uslug | Sterowanie predykcyjne / optymalizacja |

_Funkcje cross-domain (wdroz raz):_ Sterowanie predykcyjne / optymalizacja → C-4, DE-2, DHW-2b, H-2b, H-4, V-3

_Pakiety po domenie:_ Chlodzenie: C-4; Ciepla woda uzytkowa: DHW-2b; Dynamiczna obudowa budynku: DE-2; Ogrzewanie: H-2b, H-4; Wentylacja: V-3

**Uzasadnienie kolejnosci:** etapy 1-2 dostarczaja efektow bez/niskim kosztem i budują warstwe danych, ktora odblokowuje etap 3; elastycznosc (etap 4) i predykcja (etap 5) wchodza dopiero po ustabilizowaniu automatyki i danych.

---
