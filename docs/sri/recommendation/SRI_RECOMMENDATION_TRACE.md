# SRI Recommendation — Trace

- Wygenerowano: `2026-07-08T22:22:31.993509+00:00`

Dla kazdego scenariusza: wynik SRI, glowne braki, top 10 rekomendacji, priorytet, wplyw na domeny i Impact Criteria, zaleznosci, blokery oraz rekomendacje odrzucone.

## Scenariusz 1: Budynek bez automatyki

**Obecny SRI:** 0.00% (klasa G) · **Naglowek do FLmax obecnych uslug:** +91.67 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- C-2a Sterowanie zrodlem chlodu (agregatem) — potencjal +22.380 pkt (FL0→3, upgrade)
- H-1a Sterowanie ogrzewaniem w pomieszczeniach — potencjal +20.609 pkt (FL0→4, upgrade)
- DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) — potencjal +16.708 pkt (FL0→3, upgrade)
- C-1a Sterowanie chlodzeniem w pomieszczeniach — potencjal +12.510 pkt (FL0→4, upgrade)
- V-1a Sterowanie strumieniem powietrza w pomieszczeniu — potencjal +9.799 pkt (FL0→4, upgrade)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 0→4 | +20.609 | High | 1.00 | 6 | — |
| 2 | C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 0→3 | +22.380 | High | 0.80 | 5 | Modulacja mocy zrodla |
| 3 | DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 0→3 | +16.708 | High | 1.00 | 4 | — |
| 4 | C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 0→4 | +12.510 | High | 1.00 | 6 | — |
| 5 | V-1a Sterowanie strumieniem powietrza w pomieszczeniu | upgrade | 0→4 | +9.799 | High | 1.00 | 5 | — |
| 6 | L-1a Sterowanie oswietleniem wg obecnosci | upgrade | 0→3 | +6.123 | Low | 1.00 | 3 | — |
| 7 | H-2a Sterowanie zrodlem ciepla (poza pompami ciepla) | upgrade | 0→2 | +3.537 | Medium | 0.75 | 4 | Modulacja mocy zrodla |

**Oczekiwany wplyw na domeny:**

- Chlodzenie: +34.891 pkt proc.
- Ogrzewanie: +24.145 pkt proc.
- Ciepla woda uzytkowa: +16.708 pkt proc.
- Wentylacja: +9.799 pkt proc.
- Oswietlenie: +6.123 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Elastycznosc i magazynowanie energii: +33.333 pkt proc.
- Efektywnosc energetyczna: +16.667 pkt proc.
- Utrzymanie i predykcja usterek: +16.667 pkt proc.
- Wygoda obslugi: +8.334 pkt proc.
- Komfort: +8.333 pkt proc.
- Zdrowie i dostepnosc: +8.333 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **H-1a**: funkcje do wdrozenia: Centralne sterowanie automatyczne, Pomiar temperatury, Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Centralne sterowanie automatyczne, Pomiar temperatury, Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - funkcje cross-domain: Centralne sterowanie automatyczne (4 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- **C-2a**: funkcje do wdrozenia: Modulacja mocy zrodla, Dane pogodowe / prognoza, Sterowanie wg zapotrzebowania, Free-cooling, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: Modulacja mocy zrodla; konfiguracyjne/integracyjne: Dane pogodowe / prognoza, Sterowanie wg zapotrzebowania, Free-cooling, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Modulacja mocy zrodla (4 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug), Free-cooling (3 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **DHW-1b**: funkcje do wdrozenia: Harmonogramy czasowe, Pomiar temperatury, Sterowanie wg zapotrzebowania, Interfejs sygnalow sieci/taryf
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Harmonogramy czasowe, Pomiar temperatury, Sterowanie wg zapotrzebowania, Interfejs sygnalow sieci/taryf
  - funkcje cross-domain: Harmonogramy czasowe (9 uslug), Pomiar temperatury (17 uslug), Sterowanie wg zapotrzebowania (16 uslug), Interfejs sygnalow sieci/taryf (19 uslug)
- **C-1a**: funkcje do wdrozenia: Centralne sterowanie automatyczne, Pomiar temperatury, Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Centralne sterowanie automatyczne, Pomiar temperatury, Sterowanie strefowe / indywidualne, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - funkcje cross-domain: Centralne sterowanie automatyczne (4 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- **V-1a**: funkcje do wdrozenia: Sterowanie wg zapotrzebowania, Harmonogramy czasowe, Detekcja obecnosci, Pomiar CO2 / jakosci powietrza, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie wg zapotrzebowania, Harmonogramy czasowe, Detekcja obecnosci, Pomiar CO2 / jakosci powietrza, Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow
  - funkcje cross-domain: Sterowanie wg zapotrzebowania (16 uslug), Harmonogramy czasowe (9 uslug), Detekcja obecnosci (7 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug)

**Rekomendacje odrzucone i dlaczego:**

- brak

## Scenariusz 2: Male biuro z harmonogramami

**Obecny SRI:** 44.29% (klasa E) · **Naglowek do FLmax obecnych uslug:** +47.38 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- H-3 Raportowanie pracy systemu grzewczego — potencjal +17.043 pkt (FL0→4, expansion)
- C-2a Sterowanie zrodlem chlodu (agregatem) — potencjal +13.453 pkt (FL2→3, upgrade)
- V-6 Raportowanie jakosci powietrza (IAQ) — potencjal +13.007 pkt (FL0→3, expansion)
- H-1a Sterowanie ogrzewaniem w pomieszczeniach — potencjal +12.562 pkt (FL2→4, upgrade)
- C-1a Sterowanie chlodzeniem w pomieszczeniach — potencjal +7.250 pkt (FL2→4, upgrade)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | H-3 Raportowanie pracy systemu grzewczego | expansion | 0→4 | +17.043 | Critical | 1.00 | 6 | — |
| 2 | C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 2→3 | +13.453 | High | 1.00 | 2 | — |
| 3 | H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 2→4 | +12.562 | High | 1.00 | 3 | — |
| 4 | V-6 Raportowanie jakosci powietrza (IAQ) | expansion | 0→3 | +13.007 | High | 1.00 | 3 | — |
| 5 | C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 2→4 | +7.250 | High | 1.00 | 3 | — |
| 6 | DE-1 Sterowanie zacienieniem / roletami | upgrade | 2→4 | +3.042 | Critical | 1.00 | 2 | — |
| 7 | V-2d Sterowanie temperatura nawiewu (centrala) | upgrade | 1→3 | +1.354 | High | 1.00 | 2 | — |
| 8 | DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 2→3 | +4.385 | High | 1.00 | 1 | — |
| 9 | V-1a Sterowanie strumieniem powietrza w pomieszczeniu | upgrade | 2→4 | +2.257 | High | 1.00 | 2 | — |
| 10 | L-2 Sciemnianie oswietlenia wg swiatla dziennego | upgrade | 2→4 | +2.703 | Medium | 1.00 | 2 | — |

**Oczekiwany wplyw na domeny:**

- Ogrzewanie: +29.604 pkt proc.
- Chlodzenie: +20.703 pkt proc.
- Wentylacja: +16.617 pkt proc.
- Ciepla woda uzytkowa: +4.385 pkt proc.
- Oswietlenie: +3.073 pkt proc.
- Dynamiczna obudowa budynku: +3.042 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Utrzymanie i predykcja usterek: +29.597 pkt proc.
- Elastycznosc i magazynowanie energii: +17.838 pkt proc.
- Informacja dla uzytkownikow: +16.667 pkt proc.
- Efektywnosc energetyczna: +5.160 pkt proc.
- Zdrowie i dostepnosc: +3.056 pkt proc.
- Komfort: +2.861 pkt proc.
- Wygoda obslugi: +2.245 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **H-3**: funkcje do wdrozenia: Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **C-2a**: funkcje do wdrozenia: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Free-cooling (3 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **H-1a**: funkcje do wdrozenia: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - funkcje cross-domain: Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- **V-6**: funkcje do wdrozenia: Pomiar CO2 / jakosci powietrza, Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Alarmy i powiadomienia
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Pomiar CO2 / jakosci powietrza, Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Alarmy i powiadomienia
  - funkcje cross-domain: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug)
- **C-1a**: funkcje do wdrozenia: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - funkcje cross-domain: Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)

**Rekomendacje odrzucone i dlaczego:**

- H-1c Regulacja temperatury czynnika grzewczego — usluga juz na FLmax (2) — brak gapu
- H-2a Sterowanie zrodlem ciepla (poza pompami ciepla) — usluga juz na FLmax (2) — brak gapu

## Scenariusz 3: Sklep typu Decathlon (Loxone/BACnet/Modbus)

**Obecny SRI:** 73.96% (klasa C) · **Naglowek do FLmax obecnych uslug:** +26.04 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- C-2a Sterowanie zrodlem chlodu (agregatem) — potencjal +8.198 pkt (FL2→3, upgrade)
- H-4 Elastycznosc ogrzewania i wspolpraca z siecia — potencjal +4.995 pkt (FL0→4, expansion)
- H-3 Raportowanie pracy systemu grzewczego — potencjal +2.962 pkt (FL3→4, upgrade)
- DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) — potencjal +2.672 pkt (FL2→3, upgrade)
- DE-1 Sterowanie zacienieniem / roletami — potencjal +2.364 pkt (FL2→4, upgrade)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 2→3 | +8.198 | High | 1.00 | 2 | — |
| 2 | H-4 Elastycznosc ogrzewania i wspolpraca z siecia | expansion | 0→4 | +4.995 | Critical | 0.80 | 5 | Magazyn ciepla/chlodu (bufor/TES) |
| 3 | DE-1 Sterowanie zacienieniem / roletami | upgrade | 2→4 | +2.364 | Critical | 1.00 | 2 | — |
| 4 | H-3 Raportowanie pracy systemu grzewczego | upgrade | 3→4 | +2.962 | Critical | 1.00 | 1 | — |
| 5 | DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) | upgrade | 2→3 | +2.672 | High | 1.00 | 1 | — |
| 6 | C-3 Raportowanie pracy systemu chlodzenia | upgrade | 3→4 | +1.521 | High | 1.00 | 1 | — |
| 7 | E-12 Raportowanie zuzycia energii elektrycznej | upgrade | 3→4 | +1.257 | High | 1.00 | 1 | — |
| 8 | DHW-3 Raportowanie pracy systemu CWU | upgrade | 3→4 | +1.149 | High | 1.00 | 1 | — |
| 9 | E-2 Raportowanie produkcji energii (PV/OZE) | expansion | 0→4 | +0.600 | High | 1.00 | 4 | — |
| 10 | V-6 Raportowanie jakosci powietrza (IAQ) | upgrade | 2→3 | +1.868 | High | 1.00 | 1 | — |

**Oczekiwany wplyw na domeny:**

- Chlodzenie: +10.071 pkt proc.
- Ogrzewanie: +8.525 pkt proc.
- Ciepla woda uzytkowa: +3.821 pkt proc.
- Wentylacja: +2.663 pkt proc.
- Dynamiczna obudowa budynku: +2.364 pkt proc.
- Elektrycznosc: +1.857 pkt proc.
- Monitoring i sterowanie: +1.432 pkt proc.
- Oswietlenie: +0.896 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Elastycznosc i magazynowanie energii: +15.681 pkt proc.
- Utrzymanie i predykcja usterek: +7.187 pkt proc.
- Wygoda obslugi: +2.832 pkt proc.
- Efektywnosc energetyczna: +2.253 pkt proc.
- Zdrowie i dostepnosc: +1.750 pkt proc.
- Komfort: +1.156 pkt proc.
- Informacja dla uzytkownikow: +0.772 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **C-2a**: funkcje do wdrozenia: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Free-cooling (3 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **H-4**: funkcje do wdrozenia: Interfejs sygnalow sieci/taryf, Harmonogramy czasowe, Magazyn ciepla/chlodu (bufor/TES), Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - blokery sprzetowe: Magazyn ciepla/chlodu (bufor/TES); konfiguracyjne/integracyjne: Interfejs sygnalow sieci/taryf, Harmonogramy czasowe, Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - funkcje cross-domain: Interfejs sygnalow sieci/taryf (19 uslug), Harmonogramy czasowe (9 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Pomiar dwukierunkowy (6 uslug)
- **DE-1**: funkcje do wdrozenia: Sledzenie pozycji slonca, Integracja z BMS/BACS, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sledzenie pozycji slonca, Integracja z BMS/BACS, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Integracja z BMS/BACS (12 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **H-3**: funkcje do wdrozenia: Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Sterowanie predykcyjne / optymalizacja (27 uslug)
- **DHW-1b**: funkcje do wdrozenia: Interfejs sygnalow sieci/taryf
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Interfejs sygnalow sieci/taryf
  - funkcje cross-domain: Interfejs sygnalow sieci/taryf (19 uslug)

**Rekomendacje odrzucone i dlaczego:**

- H-1c Regulacja temperatury czynnika grzewczego — usluga juz na FLmax (2) — brak gapu
- H-2a Sterowanie zrodlem ciepla (poza pompami ciepla) — usluga juz na FLmax (2) — brak gapu
- L-1a Sterowanie oswietleniem wg obecnosci — usluga juz na FLmax (3) — brak gapu
- MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) — usluga juz na FLmax (3) — brak gapu
- MC-13 Centralne raportowanie pracy i zuzycia budynku — usluga juz na FLmax (3) — brak gapu
- MC-30 Jedna platforma sterowania i optymalizacji budynku — usluga juz na FLmax (3) — brak gapu

## Scenariusz 4: Nowoczesny biurowiec z BMS (bez PV/EV/magazynu)

**Obecny SRI:** 89.27% (klasa B) · **Naglowek do FLmax obecnych uslug:** +10.73 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- H-4 Elastycznosc ogrzewania i wspolpraca z siecia — potencjal +4.020 pkt (FL2→4, upgrade)
- H-2b Sterowanie pompa ciepla — potencjal +3.279 pkt (FL2→3, upgrade)
- C-4 Elastycznosc chlodzenia i wspolpraca z siecia — potencjal +2.307 pkt (FL2→4, upgrade)
- DHW-2b Kaskada / sekwencja zrodel CWU — potencjal +0.745 pkt (FL3→4, upgrade)
- E-3 Magazynowanie energii elektrycznej — potencjal +0.342 pkt (FL0→4, expansion)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | H-4 Elastycznosc ogrzewania i wspolpraca z siecia | upgrade | 2→4 | +4.020 | Critical | 1.00 | 2 | — |
| 2 | H-2b Sterowanie pompa ciepla | upgrade | 2→3 | +3.279 | Critical | 0.67 | 3 | Magazyn ciepla/chlodu (bufor/TES) |
| 3 | C-4 Elastycznosc chlodzenia i wspolpraca z siecia | upgrade | 2→4 | +2.307 | High | 1.00 | 2 | — |
| 4 | DHW-2b Kaskada / sekwencja zrodel CWU | upgrade | 3→4 | +0.745 | High | 1.00 | 1 | — |
| 5 | E-2 Raportowanie produkcji energii (PV/OZE) | expansion | 0→4 | +0.055 | High | 1.00 | 4 | — |
| 6 | E-3 Magazynowanie energii elektrycznej | expansion | 0→4 | +0.342 | High | 0.80 | 4 | Magazyn energii elektrycznej |
| 7 | V-3 Free-cooling wentylacja mechaniczna | upgrade | 2→3 | +0.203 | High | 1.00 | 1 | — |
| 8 | DE-2 Sterowanie otwieraniem okien z HVAC | upgrade | 2→3 | +0.174 | High | 1.00 | 1 | — |
| 9 | EV-15 Infrastruktura i moc ladowania EV | expansion | 0→4 | +0.050 | Low | 0.80 | 3 | Punkt ladowania EV |

**Oczekiwany wplyw na domeny:**

- Ogrzewanie: +7.299 pkt proc.
- Chlodzenie: +2.307 pkt proc.
- Ciepla woda uzytkowa: +0.745 pkt proc.
- Elektrycznosc: +0.397 pkt proc.
- Wentylacja: +0.203 pkt proc.
- Dynamiczna obudowa budynku: +0.174 pkt proc.
- Ladowanie pojazdow elektrycznych: +0.050 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Elastycznosc i magazynowanie energii: +9.117 pkt proc.
- Zdrowie i dostepnosc: +0.889 pkt proc.
- Wygoda obslugi: +0.604 pkt proc.
- Komfort: +0.357 pkt proc.
- Efektywnosc energetyczna: +0.207 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **H-4**: funkcje do wdrozenia: Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - funkcje cross-domain: Sterowanie predykcyjne / optymalizacja (27 uslug), Pomiar dwukierunkowy (6 uslug)
- **H-2b**: funkcje do wdrozenia: Interfejs sygnalow sieci/taryf, Sterowanie predykcyjne / optymalizacja, Magazyn ciepla/chlodu (bufor/TES)
  - blokery sprzetowe: Magazyn ciepla/chlodu (bufor/TES); konfiguracyjne/integracyjne: Interfejs sygnalow sieci/taryf, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug)
- **C-4**: funkcje do wdrozenia: Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie predykcyjne / optymalizacja, Pomiar dwukierunkowy
  - funkcje cross-domain: Sterowanie predykcyjne / optymalizacja (27 uslug), Pomiar dwukierunkowy (6 uslug)
- **DHW-2b**: funkcje do wdrozenia: Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Sterowanie predykcyjne / optymalizacja (27 uslug)
- **E-2**: funkcje do wdrozenia: Monitoring produkcji PV/OZE, Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Alarmy i powiadomienia, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Monitoring produkcji PV/OZE, Platforma raportowania/wizualizacji, Rejestracja i historia danych (trendy), Alarmy i powiadomienia, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)

**Rekomendacje odrzucone i dlaczego:**

- H-1a Sterowanie ogrzewaniem w pomieszczeniach — usluga juz na FLmax (4) — brak gapu
- H-1c Regulacja temperatury czynnika grzewczego — usluga juz na FLmax (2) — brak gapu
- H-1d Sterowanie pompami obiegowymi ogrzewania — podniesienie nie zmienia SRI w tym kontekscie (kryteria bez wagi/nasycone)
- H-2d Kaskada / sekwencja wielu zrodel ciepla — usluga juz na FLmax (4) — brak gapu
- H-3 Raportowanie pracy systemu grzewczego — usluga juz na FLmax (4) — brak gapu
- DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) — usluga juz na FLmax (3) — brak gapu
- DHW-3 Raportowanie pracy systemu CWU — usluga juz na FLmax (4) — brak gapu
- C-1a Sterowanie chlodzeniem w pomieszczeniach — usluga juz na FLmax (4) — brak gapu
- C-1d Sterowanie pompami obiegowymi chlodzenia — podniesienie nie zmienia SRI w tym kontekscie (kryteria bez wagi/nasycone)
- C-2a Sterowanie zrodlem chlodu (agregatem) — usluga juz na FLmax (3) — brak gapu
- C-2b Kaskada / sekwencja zrodel chlodu — usluga juz na FLmax (4) — brak gapu
- C-3 Raportowanie pracy systemu chlodzenia — usluga juz na FLmax (4) — brak gapu
- V-1a Sterowanie strumieniem powietrza w pomieszczeniu — usluga juz na FLmax (4) — brak gapu
- V-1c Sterowanie wentylatorami centrali (przeplyw/cisnienie) — podniesienie nie zmienia SRI w tym kontekscie (kryteria bez wagi/nasycone)
- V-2d Sterowanie temperatura nawiewu (centrala) — usluga juz na FLmax (3) — brak gapu
- V-6 Raportowanie jakosci powietrza (IAQ) — usluga juz na FLmax (3) — brak gapu
- L-1a Sterowanie oswietleniem wg obecnosci — usluga juz na FLmax (3) — brak gapu
- L-2 Sciemnianie oswietlenia wg swiatla dziennego — usluga juz na FLmax (4) — brak gapu
- DE-1 Sterowanie zacienieniem / roletami — usluga juz na FLmax (4) — brak gapu
- DE-4 Raportowanie pracy dynamicznej powloki budynku — usluga juz na FLmax (4) — brak gapu
- MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) — usluga juz na FLmax (3) — brak gapu
- MC-4 Wykrywanie i diagnostyka usterek (FDD) — usluga juz na FLmax (3) — brak gapu
- MC-9 Detekcja obecnosci dla wielu systemow — usluga juz na FLmax (2) — brak gapu
- MC-13 Centralne raportowanie pracy i zuzycia budynku — usluga juz na FLmax (3) — brak gapu
- MC-30 Jedna platforma sterowania i optymalizacji budynku — usluga juz na FLmax (3) — brak gapu

## Scenariusz 5: Budynek z PV i EV, ale bez magazynu energii

**Obecny SRI:** 57.31% (klasa D) · **Naglowek do FLmax obecnych uslug:** +42.69 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- C-2a Sterowanie zrodlem chlodu (agregatem) — potencjal +8.925 pkt (FL2→3, upgrade)
- MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) — potencjal +8.305 pkt (FL2→3, upgrade)
- C-1a Sterowanie chlodzeniem w pomieszczeniach — potencjal +4.432 pkt (FL2→4, upgrade)
- H-3 Raportowanie pracy systemu grzewczego — potencjal +3.757 pkt (FL2→4, upgrade)
- V-1a Sterowanie strumieniem powietrza w pomieszczeniu — potencjal +2.708 pkt (FL2→4, upgrade)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | C-2a Sterowanie zrodlem chlodu (agregatem) | upgrade | 2→3 | +8.925 | High | 1.00 | 2 | — |
| 2 | MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) | upgrade | 2→3 | +8.305 | Critical | 1.00 | 1 | — |
| 3 | H-3 Raportowanie pracy systemu grzewczego | upgrade | 2→4 | +3.757 | Critical | 1.00 | 3 | — |
| 4 | C-1a Sterowanie chlodzeniem w pomieszczeniach | upgrade | 2→4 | +4.432 | High | 1.00 | 3 | — |
| 5 | DE-1 Sterowanie zacienieniem / roletami | upgrade | 2→4 | +2.389 | Critical | 1.00 | 2 | — |
| 6 | E-4 Optymalizacja autokonsumpcji energii z PV | upgrade | 1→3 | +1.715 | High | 1.00 | 2 | — |
| 7 | V-1a Sterowanie strumieniem powietrza w pomieszczeniu | upgrade | 2→4 | +2.708 | High | 1.00 | 2 | — |
| 8 | H-1a Sterowanie ogrzewaniem w pomieszczeniach | upgrade | 2→4 | +2.349 | High | 1.00 | 3 | — |
| 9 | E-12 Raportowanie zuzycia energii elektrycznej | upgrade | 2→4 | +0.903 | High | 1.00 | 2 | — |
| 10 | L-2 Sciemnianie oswietlenia wg swiatla dziennego | upgrade | 2→4 | +2.107 | Medium | 1.00 | 2 | — |

**Oczekiwany wplyw na domeny:**

- Chlodzenie: +13.357 pkt proc.
- Monitoring i sterowanie: +10.760 pkt proc.
- Ogrzewanie: +6.106 pkt proc.
- Wentylacja: +4.812 pkt proc.
- Elektrycznosc: +3.515 pkt proc.
- Oswietlenie: +2.421 pkt proc.
- Dynamiczna obudowa budynku: +2.389 pkt proc.
- Ladowanie pojazdow elektrycznych: +0.232 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Elastycznosc i magazynowanie energii: +18.239 pkt proc.
- Utrzymanie i predykcja usterek: +10.662 pkt proc.
- Efektywnosc energetyczna: +5.304 pkt proc.
- Wygoda obslugi: +3.133 pkt proc.
- Komfort: +2.200 pkt proc.
- Informacja dla uzytkownikow: +2.053 pkt proc.
- Zdrowie i dostepnosc: +2.000 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **C-2a**: funkcje do wdrozenia: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Free-cooling, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Free-cooling (3 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **MC-3**: funkcje do wdrozenia: Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Detekcja obecnosci
  - funkcje cross-domain: Detekcja obecnosci (7 uslug)
- **H-3**: funkcje do wdrozenia: Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **C-1a**: funkcje do wdrozenia: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Integracja z BMS/BACS, Komunikacja cyfrowa sterownikow, Detekcja obecnosci
  - funkcje cross-domain: Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- **DE-1**: funkcje do wdrozenia: Sledzenie pozycji slonca, Integracja z BMS/BACS, Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sledzenie pozycji slonca, Integracja z BMS/BACS, Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Integracja z BMS/BACS (12 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)

**Rekomendacje odrzucone i dlaczego:**

- H-1c Regulacja temperatury czynnika grzewczego — usluga juz na FLmax (2) — brak gapu
- H-2a Sterowanie zrodlem ciepla (poza pompami ciepla) — usluga juz na FLmax (2) — brak gapu
- E-2 Raportowanie produkcji energii (PV/OZE) — usluga juz na FLmax (4) — brak gapu
- EV-17 Informacja i laczonosc ladowania EV — usluga juz na FLmax (2) — brak gapu

## Scenariusz 6: Budynek z dobrym HVAC, ale slabym monitoringiem energii

**Obecny SRI:** 74.05% (klasa C) · **Naglowek do FLmax obecnych uslug:** +25.95 pkt proc.

**Glowne braki (wg marginalnego przyrostu SRI):**

- MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) — potencjal +4.668 pkt (FL2→3, upgrade)
- H-3 Raportowanie pracy systemu grzewczego — potencjal +3.785 pkt (FL1→4, upgrade)
- MC-4 Wykrywanie i diagnostyka usterek (FDD) — potencjal +3.135 pkt (FL1→3, upgrade)
- E-12 Raportowanie zuzycia energii elektrycznej — potencjal +2.529 pkt (FL1→4, upgrade)
- H-2d Kaskada / sekwencja wielu zrodel ciepla — potencjal +2.459 pkt (FL3→4, upgrade)

**Top 10 rekomendacji (ranking kontekstowy):**

| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |
|---|---|---|---|---|---|---|---|---|
| 1 | H-3 Raportowanie pracy systemu grzewczego | upgrade | 1→4 | +3.785 | Critical | 1.00 | 5 | — |
| 2 | MC-3 Zarzadzanie czasem pracy instalacji (harmonogramy) | upgrade | 2→3 | +4.668 | Critical | 1.00 | 1 | — |
| 3 | E-12 Raportowanie zuzycia energii elektrycznej | upgrade | 1→4 | +2.529 | High | 1.00 | 3 | — |
| 4 | H-2d Kaskada / sekwencja wielu zrodel ciepla | upgrade | 3→4 | +2.459 | Critical | 1.00 | 2 | — |
| 5 | C-3 Raportowanie pracy systemu chlodzenia | upgrade | 1→4 | +2.344 | High | 1.00 | 5 | — |
| 6 | MC-4 Wykrywanie i diagnostyka usterek (FDD) | upgrade | 1→3 | +3.135 | High | 1.00 | 3 | — |
| 7 | DHW-3 Raportowanie pracy systemu CWU | upgrade | 1→4 | +1.972 | High | 1.00 | 4 | — |
| 8 | MC-13 Centralne raportowanie pracy i zuzycia budynku | upgrade | 1→3 | +2.301 | High | 1.00 | 4 | — |
| 9 | DE-1 Sterowanie zacienieniem / roletami | upgrade | 3→4 | +0.889 | Critical | 1.00 | 2 | — |
| 10 | V-6 Raportowanie jakosci powietrza (IAQ) | upgrade | 2→3 | +1.868 | High | 1.00 | 1 | — |

**Oczekiwany wplyw na domeny:**

- Monitoring i sterowanie: +10.104 pkt proc.
- Ogrzewanie: +6.245 pkt proc.
- Elektrycznosc: +2.529 pkt proc.
- Chlodzenie: +2.344 pkt proc.
- Ciepla woda uzytkowa: +1.972 pkt proc.
- Wentylacja: +1.868 pkt proc.
- Dynamiczna obudowa budynku: +0.889 pkt proc.

**Oczekiwany wplyw na Impact Criteria:**

- Utrzymanie i predykcja usterek: +9.133 pkt proc.
- Elastycznosc i magazynowanie energii: +6.088 pkt proc.
- Informacja dla uzytkownikow: +5.144 pkt proc.
- Wygoda obslugi: +2.680 pkt proc.
- Zdrowie i dostepnosc: +1.278 pkt proc.
- Efektywnosc energetyczna: +1.184 pkt proc.
- Komfort: +0.444 pkt proc.

**Zaleznosci / blokery top rekomendacji:**

- **H-3**: funkcje do wdrozenia: Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **MC-3**: funkcje do wdrozenia: Detekcja obecnosci
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Detekcja obecnosci
  - funkcje cross-domain: Detekcja obecnosci (7 uslug)
- **E-12**: funkcje do wdrozenia: Rejestracja i historia danych (trendy), Alarmy i powiadomienia, Podlicznikowanie (submetering), Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Rejestracja i historia danych (trendy), Alarmy i powiadomienia, Podlicznikowanie (submetering), Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- **H-2d**: funkcje do wdrozenia: Sterowanie predykcyjne / optymalizacja, Dane pogodowe / prognoza
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Sterowanie predykcyjne / optymalizacja, Dane pogodowe / prognoza
  - funkcje cross-domain: Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- **C-3**: funkcje do wdrozenia: Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - blokery sprzetowe: —; konfiguracyjne/integracyjne: Rejestracja i historia danych (trendy), Pomiar energii/ciepla/chlodu, Alarmy i powiadomienia, Wykrywanie usterek (FDD), Sterowanie predykcyjne / optymalizacja
  - funkcje cross-domain: Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)

**Rekomendacje odrzucone i dlaczego:**

- H-1a Sterowanie ogrzewaniem w pomieszczeniach — usluga juz na FLmax (4) — brak gapu
- H-1c Regulacja temperatury czynnika grzewczego — usluga juz na FLmax (2) — brak gapu
- H-2b Sterowanie pompa ciepla — usluga juz na FLmax (3) — brak gapu
- DHW-1b Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) — usluga juz na FLmax (3) — brak gapu
- C-1a Sterowanie chlodzeniem w pomieszczeniach — usluga juz na FLmax (4) — brak gapu
- C-2a Sterowanie zrodlem chlodu (agregatem) — usluga juz na FLmax (3) — brak gapu
- V-1a Sterowanie strumieniem powietrza w pomieszczeniu — usluga juz na FLmax (4) — brak gapu
- V-1c Sterowanie wentylatorami centrali (przeplyw/cisnienie) — podniesienie nie zmienia SRI w tym kontekscie (kryteria bez wagi/nasycone)
- V-2d Sterowanie temperatura nawiewu (centrala) — usluga juz na FLmax (3) — brak gapu
- L-1a Sterowanie oswietleniem wg obecnosci — usluga juz na FLmax (3) — brak gapu
- L-2 Sciemnianie oswietlenia wg swiatla dziennego — usluga juz na FLmax (4) — brak gapu
