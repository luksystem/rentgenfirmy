# SRI Recommendation Model

> Warstwa **pomocnicza (advisory)** nad oficjalna metodologia SRI. Nie zmienia punktacji. Odpowiada: dlaczego wynik jest niski, ktore braki wazą najwiecej, jakie dzialania podniosa wynik i co wdrozyc najpierw. Bez ofert, kosztow i ROI.

- Wygenerowano: `2026-07-09T15:51:18.682892+00:00`
- Wersja: `1.0.0`
- Uslug objetych: **54 / 54**

## Struktura rekomendacji (7 sekcji na usluge)

1. **Gap Description** — co oznacza brak uslugi.
2. **Business Impact** — wplyw na 6 wymiarow (EE, komfort, utrzymanie, bezpieczenstwo, eksploatacja, elastycznosc).
3. **Technical Recommendation** — funkcje do wdrozenia (bez producenta).
4. **Expected Improvement** — domena i Impact Criteria, ktore wzrosna.
5. **Dependencies** — co wdrozyc wczesniej.
6. **Verification** — jak potwierdzic realizacje.
7. **Priority** — Critical / High / Medium / Low.

## Chlodzenie (`cooling`)

### C-1a — Sterowanie chlodzeniem w pomieszczeniach (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #29  ·  **Expected Gain:** 1.469% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie chlodzeniem w pomieszczeniach (usluga C-1a). Dostarczanie chlodu do pomieszczen zgodnie z rzeczywistym zapotrzebowaniem i obecnoscia, utrzymujac komfort przy minimalnym zuzyciu energii. Znaczenie energetyczne: Chlodzenie jest energochlonne — indywidualna regulacja i wylaczanie chlodzenia w pustych strefach daja duze oszczednosci i redukcje szczytow mocy latem.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.169% |
| Komfort | sredni | 2 | 0.267% |
| Utrzymanie | niski | 1 | 0.273% |
| Bezpieczenstwo | sredni | 2 | 0.533% |
| Eksploatacja | wysoki | 3 | 0.227% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Centralne sterowanie automatyczne (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, official_methodology)
- Integracja z BMS/BACS (od FL3, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL3, official_methodology)
- Detekcja obecnosci (od FL4, official_methodology)
- _Kierunki modernizacji:_ indywidualne sterowanie stref i harmonogramy, detekcja obecnosci w salach, integracja z zacienieniem i BMS
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Zdrowie i dostepnosc (+0.533%); Utrzymanie i predykcja usterek (+0.273%); Komfort (+0.267%); Wygoda obslugi (+0.227%); Efektywnosc energetyczna (+0.169%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Centralne sterowanie automatyczne, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Centralne sterowanie automatyczne (4 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- Powiazane uslugi: C-1c (temperatura wody lodowej), C-1f (blokada grzanie/chlodzenie), C-2a (zrodlo chlodu), DE-1 (zacienienie ogranicza zyski ciepla)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc automatycznej regulacji zamiast sterowania recznego.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- _Dowody:_ architektura BMS, konfiguracja sterownika/BMS, lista I/O, lista czujnikow, lista czujnikow PIR/obecnosci, lista integracji, lista urzadzen na magistrali, nastawy per pomieszczenie w BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-1b — Sterowanie chlodzeniem plaszczyznowym TABS (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #15  ·  **Expected Gain:** 1.651% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie chlodzeniem plaszczyznowym TABS (usluga C-1b). Regulacja chlodzenia w masie budynku (TABS) z wykorzystaniem bezwladnosci do stabilnego, energooszczednego chlodzenia (czesto pasywnego). Znaczenie energetyczne: Chlodzenie wysokotemperaturowe TABS umozliwia free-cooling i wysoka sprawnosc agregatow; przesuwanie chlodzenia na noc obniza koszty.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | sredni | 2 | 0.267% |
| Utrzymanie | niski | 1 | 0.273% |
| Bezpieczenstwo | sredni | 2 | 0.533% |
| Eksploatacja | wysoki | 3 | 0.465% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Centralne sterowanie automatyczne (od FL1, official_methodology)
- Pomiar wilgotnosci (od FL1, engineering_assumption)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Dane pogodowe / prognoza (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ dodanie ochrony antykondensacyjnej, sterowanie predykcyjne i free-cooling, przesuniecie chlodzenia na noc
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Zdrowie i dostepnosc (+0.533%); Utrzymanie i predykcja usterek (+0.273%); Komfort (+0.267%); Informacja dla uzytkownikow (+0.238%); Wygoda obslugi (+0.227%); Efektywnosc energetyczna (+0.112%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Centralne sterowanie automatyczne, Pomiar temperatury, Pomiar wilgotnosci
- Funkcje wspoldzielone miedzydomenowo: Centralne sterowanie automatyczne (4 uslug), Pomiar wilgotnosci (2 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- Powiazane uslugi: C-1c (temperatura wody), C-1f (blokada grzanie/chlodzenie), H-1b (ten sam TABS w trybie grzania)

**6. Verification.**

- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc automatycznej regulacji zamiast sterowania recznego.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz punkty pomiaru wilgotnosci i ich wykorzystanie w logice.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja ochrony antykondensacyjnej, konfiguracja stacji pogodowej/feedu, konfiguracja sterownika/BMS, lista czujnikow, nastawy per strefa w BMS, odczyt z BMS, opis logiki optymalizacji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-1c — Regulacja temperatury wody lodowej (FLmax 2)

**Priorytet:** Low  ·  **Ranking:** #46  ·  **Expected Gain:** 0.322% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Regulacja temperatury wody lodowej (usluga C-1c). Dostosowanie temperatury wody lodowej w sieci dystrybucji do rzeczywistego zapotrzebowania, zamiast produkcji nadmiernie zimnej wody. Znaczenie energetyczne: Podniesienie temperatury wody lodowej, gdy to mozliwe, znaczaco poprawia sprawnosc agregatow (EER) i umozliwia free-cooling.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | niski | 1 | 0.133% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.076% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar temperatury (od FL1, engineering_assumption)
- Dane pogodowe / prognoza (od FL1, official_methodology)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- _Kierunki modernizacji:_ wdrozenie resetu temperatury wody lodowej, podniesienie temperatury dla free-coolingu, regulacja wg zapotrzebowania
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Komfort (+0.133%); Efektywnosc energetyczna (+0.112%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug)
- Powiazane uslugi: C-1d (pompy), C-2a/C-2b (zrodlo chlodu), C-1a (odbior w strefach)

**6. Verification.**

- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- przejrzyj trendy temperatur
- sprawdz, czy temperatura wody lodowej jest stala czy resetowana
- zweryfikuj powiazanie z zapotrzebowaniem stref
- _Dowody:_ konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, lista czujnikow, nastawy resetu temperatury, odczyt z BMS, schemat zrodla chlodu, trendy nastaw vs zapotrzebowanie, trendy temperatur wody lodowej vs obciazenie
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-1d — Sterowanie pompami obiegowymi chlodzenia (FLmax 4)

**Priorytet:** Low  ·  **Ranking:** #54  ·  **Expected Gain:** 0.112% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie pompami obiegowymi chlodzenia (usluga C-1d). Redukcja energii pomp wody lodowej przez dopasowanie ich pracy do wymaganego przeplywu. Znaczenie energetyczne: Pompy o zmiennej predkosci wg zapotrzebowania radykalnie obnizaja pomocnicze zuzycie energii chlodzenia.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterowanie wg zapotrzebowania (od FL1, official_methodology)
- Naped o zmiennej predkosci (falownik) (od FL2, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL4, official_methodology)
- _Kierunki modernizacji:_ wymiana pomp na elektroniczne, regulacja proporcjonalna/wg zapotrzebowania, wylaczanie poza sezonem
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.112%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterowanie wg zapotrzebowania
- Funkcje wspoldzielone miedzydomenowo: Sterowanie wg zapotrzebowania (16 uslug), Naped o zmiennej predkosci (falownik) (3 uslug), Komunikacja cyfrowa sterownikow (10 uslug)
- Powiazane uslugi: C-1a (odbior w strefach), C-1c (temperatura wody), C-3 (raportowanie)

**6. Verification.**

- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz obecnosc falownikow i tryb regulacji (nie stala predkosc).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- przejrzyj trendy predkosci/mocy
- sprawdz typ pomp i tryb regulacji
- ustal, czy pompa reaguje na zapotrzebowanie
- _Dowody:_ DTR pomp, DTR pomp/wentylatorow, konfiguracja logiki w BMS, lista urzadzen na magistrali, nastawy trybu pracy, schemat magistrali (KNX/BACnet/Modbus), trendy nastaw vs zapotrzebowanie, trendy poboru mocy
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-1f — Blokada jednoczesnego grzania i chlodzenia (FLmax 2)

**Priorytet:** Low  ·  **Ranking:** #48  ·  **Expected Gain:** 0.169% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Blokada jednoczesnego grzania i chlodzenia (usluga C-1f). Zapobieganie marnotrawstwu energii przez uniemozliwienie jednoczesnego ogrzewania i chlodzenia tego samego pomieszczenia. Znaczenie energetyczne: Eliminuje jeden z najczestszych i najbardziej kosztownych bledow — walke instalacji grzewczej z chlodnicza; szybki, tani zysk.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.169% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Blokada/koordynacja trybow (interlock) (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Integracja z BMS/BACS (od FL2, official_methodology)
- _Kierunki modernizacji:_ wprowadzenie martwej strefy i blokady, koordynacja sezonowa w BMS, usuniecie recznych wymuszen
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.169%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Blokada/koordynacja trybow (interlock), Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Integracja z BMS/BACS (12 uslug)
- Powiazane uslugi: H-1a/H-1b (grzanie strefy), C-1a/C-1b (chlodzenie strefy)

**6. Verification.**

- Sprawdz martwa strefe i brak jednoczesnej pracy grzanie/chlodzenie.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- sprawdz, czy istnieje martwa strefa miedzy nastawami H i C
- ustal koordynacje w BMS (poziom 2)
- zweryfikuj, czy nie wystepuje jednoczesna praca (trendy)
- _Dowody:_ architektura BMS, konfiguracja dead-band/interlock, lista czujnikow, lista integracji, odczyt z BMS, opis logiki w projekcie, trendy trybow H/C, trendy trybow H/C strefy
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-1g — Sterowanie magazynem chlodu (TES) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #40  ·  **Expected Gain:** 0.738% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie magazynem chlodu (TES) (usluga C-1g). Gromadzenie chlodu (woda lodowa/lod) w celu przesuniecia produkcji na godziny tanie/nocne i redukcji szczytow mocy. Znaczenie energetyczne: Produkcja chlodu noca (nizsza temperatura, tansza energia) i rozladunek w szczycie obniza koszty i zapotrzebowanie mocy oraz odciaza siec.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | sredni | 2 | 0.626% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Harmonogramy czasowe (od FL1, engineering_assumption)
- Pomiar temperatury (od FL1, engineering_assumption)
- Magazyn ciepla/chlodu (bufor/TES) (od FL1, official_methodology)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- _Kierunki modernizacji:_ dodanie magazynu chlodu do obiektow o duzym szczycie chlodniczym, sterowanie taryfowe ladowania, integracja z EMS
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.626%); Efektywnosc energetyczna (+0.112%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Magazyn ciepla/chlodu (bufor/TES), Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Pomiar temperatury (17 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug), Sterowanie wg zapotrzebowania (16 uslug), Interfejs sygnalow sieci/taryf (19 uslug)
- Powiazane uslugi: C-2a/C-2b (produkcja chlodu), C-4 (elastycznosc/siec), MC-25 (smart grid)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz logike ladowania/rozladowania
- _Dowody:_ DTR, konfiguracja harmonogramow w BMS, konfiguracja ladowania, konfiguracja logiki w BMS, konfiguracja taryf/OpenADR/SG-Ready, lista czujnikow, odczyt z BMS, schemat hydrauliczny z buforem
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-2a — Sterowanie zrodlem chlodu (agregatem) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #37  ·  **Expected Gain:** 1.318% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie zrodlem chlodu (agregatem) (usluga C-2a). Optymalna praca agregatu chlodniczego tak, aby produkowal chlod o odpowiednich parametrach z wysoka sprawnoscia (EER). Znaczenie energetyczne: Dostosowanie parametrow i unikanie taktowania podnosi EER; free-cooling i wyzsza temperatura wody lodowej daja duze oszczednosci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | sredni | 2 | 0.267% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | wysoki | 3 | 0.939% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Modulacja mocy zrodla (od FL1, official_methodology)
- Dane pogodowe / prognoza (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Free-cooling (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie free-coolingu, reset temperatury wody lodowej, wymiana na agregat inwerterowy
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.939%); Komfort (+0.267%); Efektywnosc energetyczna (+0.112%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Modulacja mocy zrodla
- Funkcje wspoldzielone miedzydomenowo: Modulacja mocy zrodla (4 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug), Free-cooling (3 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: C-1c (temperatura wody), C-2b (kaskada), C-3 (raportowanie)

**6. Verification.**

- Sprawdz logike free-coolingu i jej realne dzialanie.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zdolnosc modulacji mocy i jej wykorzystanie.
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- przejrzyj trendy EER/obciazenia
- _Dowody:_ DTR agregatu, DTR/tabliczka zrodla, konfiguracja BMS/platformy, konfiguracja economizera, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, nastawy sterownika, odczyt z BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-2b — Kaskada / sekwencja zrodel chlodu (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #25  ·  **Expected Gain:** 1.107% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Kaskada / sekwencja zrodel chlodu (usluga C-2b). Optymalne zalaczanie kilku agregatow chlodniczych wg sprawnosci i obciazenia dla najnizszego zuzycia energii. Znaczenie energetyczne: Praca agregatow w optymalnym zakresie obciazenia (unikanie pracy jednego mocno przy niskim EER) obniza zuzycie energii chlodzenia.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.169% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | wysoki | 3 | 0.939% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterownik kaskady/sekwencji zrodel (od FL1, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ menedzer kaskady wg sprawnosci czesciowej, rownowazenie motogodzin, integracja z magazynem chlodu
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.939%); Efektywnosc energetyczna (+0.169%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterownik kaskady/sekwencji zrodel
- Funkcje wspoldzielone miedzydomenowo: Sterownik kaskady/sekwencji zrodel (3 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: C-2a (agregaty), C-1g (magazyn chlodu), C-3 (raportowanie)

**6. Verification.**

- Sprawdz logike sekwencjonowania i kryteria przelaczania zrodel.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- przejrzyj udzial agregatow w trendach
- sprawdz kryteria przelaczania i rownowazenie motogodzin
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja kaskady, konfiguracja kaskady w BMS, konfiguracja taryf/OpenADR/SG-Ready, lista licznikow, odczyt z BMS, opis logiki optymalizacji, schemat maszynowni
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-3 — Raportowanie pracy systemu chlodzenia (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #33  ·  **Expected Gain:** 1.666% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie pracy systemu chlodzenia (usluga C-3). Dostarczanie danych o zuzyciu i sprawnosci chlodzenia dla monitoringu, wykrywania odchylen i optymalizacji. Znaczenie energetyczne: Monitoring ujawnia spadki EER, wycieki i bledy nastaw; umozliwia utrzymanie sprawnosci i redukcje kosztow letnich.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.056% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | wysoki | 3 | 0.820% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.790% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Wykrywanie usterek (FDD) (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ montaz licznikow chlodu/energii, dashboard EER i alarmy, benchmarking kWh/m2 chlodu
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+0.820%); Informacja dla uzytkownikow (+0.714%); Wygoda obslugi (+0.076%); Efektywnosc energetyczna (+0.056%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: C-2a/C-2b (zrodla danych), MC-13 (centralne raportowanie), MC-4 (detekcja usterek)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- _Dowody:_ dashboardy zuzycia chlodu, dostep do platformy, eksport trendow, eksport trendow EER, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja powiadomien, lista alarmow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### C-4 — Elastycznosc chlodzenia i wspolpraca z siecia (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #18  ·  **Expected Gain:** 1.945% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Elastycznosc chlodzenia i wspolpraca z siecia (usluga C-4). Przesuwanie poboru energii na chlodzenie w odpowiedzi na sygnaly sieci/taryf, redukcja szczytow i kosztow. Znaczenie energetyczne: Szczyt zapotrzebowania na moc czesto przypada na chlodzenie latem — elastycznosc obniza szczyty, koszty i wspiera siec; wysoka waga w SRI.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.112% |
| Komfort | wysoki | 3 | 0.400% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | niski | 1 | 0.267% |
| Eksploatacja | wysoki | 3 | 0.227% |
| Elastycznosc energetyczna | wysoki | 3 | 0.939% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, official_methodology)
- Harmonogramy czasowe (od FL1, engineering_assumption)
- Magazyn ciepla/chlodu (bufor/TES) (od FL2, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Pomiar dwukierunkowy (od FL4, official_methodology)
- _Kierunki modernizacji:_ sterowanie taryfowe agregatow, dodanie magazynu chlodu, integracja z EMS/sygnalami sieci
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Chlodzenie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.939%); Komfort (+0.400%); Zdrowie i dostepnosc (+0.267%); Wygoda obslugi (+0.227%); Efektywnosc energetyczna (+0.112%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Interfejs sygnalow sieci/taryf
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Harmonogramy czasowe (9 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Pomiar dwukierunkowy (6 uslug)
- Powiazane uslugi: C-1g (magazyn chlodu), C-2a (agregat), MC-25 (smart grid), E-3 (magazyn energii)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz wykorzystanie magazynu/masy
- _Dowody:_ DTR, DTR/tabliczka licznika, konfiguracja BMS/platformy, konfiguracja harmonogramow w BMS, konfiguracja taryf/DSM w EMS, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu, opis logiki optymalizacji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Ciepla woda uzytkowa (`domestic_hot_water`)

### DHW-1a — Sterowanie ladowaniem zasobnika CWU (grzalka / pompa ciepla) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #14  ·  **Expected Gain:** 1.680% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie ladowaniem zasobnika CWU (grzalka / pompa ciepla) (usluga DHW-1a). Podgrzewanie zasobnika CWU z bezposredniego zrodla elektrycznego lub zintegrowanej pompy ciepla dokladnie wtedy, gdy jest to potrzebne i najtansze, z zachowaniem higieny. Znaczenie energetyczne: CWU to znaczna czesc zuzycia energii; sterowanie czasem ladowania (taryfy, PV) i temperatura mocno obniza koszt bez utraty komfortu i bezpieczenstwa mikrobiologicznego.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.279% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.238% |
| Elastycznosc energetyczna | wysoki | 3 | 1.163% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Harmonogramy czasowe (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- Optymalizacja autokonsumpcji (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ wprowadzenie ladowania wg taryf i nadwyzki PV, obnizenie temperatury utrzymania z zachowaniem antylegionella, wymiana na zasobnik z PC
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ciepla woda uzytkowa
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.163%); Efektywnosc energetyczna (+0.279%); Wygoda obslugi (+0.238%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Pomiar temperatury (17 uslug), Sterowanie wg zapotrzebowania (16 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Optymalizacja autokonsumpcji (4 uslug)
- Powiazane uslugi: DHW-2b (sekwencja zrodel), DHW-3 (raportowanie), E-4 (autokonsumpcja PV), H-2b (wspolna PC)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz reakcje odbiornikow na nadwyzke produkcji.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz harmonogram i logike temperatur
- _Dowody:_ konfiguracja EMS/priorytetow, konfiguracja PV/taryf, konfiguracja harmonogramow w BMS, konfiguracja logiki w BMS, konfiguracja taryf/OpenADR/SG-Ready, lista czujnikow, log programu antylegionella, nastawy sterownika CWU
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DHW-1b — Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #13  ·  **Expected Gain:** 1.680% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie ladowaniem zasobnika CWU (z kotla/wezla) (usluga DHW-1b). Efektywne ladowanie zasobnika CWU z zrodla produkcji ciepla (kociol, wezel, PC hydrauliczna) przy zachowaniu komfortu i higieny. Znaczenie energetyczne: Priorytetyzacja i wlasciwe temperatury ladowania ograniczaja straty i pozwalaja zrodlu pracowac sprawnie; sterowanie czasem obniza koszty.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.279% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.238% |
| Elastycznosc energetyczna | wysoki | 3 | 1.163% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Harmonogramy czasowe (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie priorytetu CWU i harmonogramow, sterowanie ladowaniem wg taryf, izolacja zasobnika i obiegow
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ciepla woda uzytkowa
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.163%); Efektywnosc energetyczna (+0.279%); Wygoda obslugi (+0.238%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Pomiar temperatury (17 uslug), Sterowanie wg zapotrzebowania (16 uslug), Interfejs sygnalow sieci/taryf (19 uslug)
- Powiazane uslugi: H-2a/H-2b (zrodlo), DHW-2b (sekwencja zrodel), DHW-3 (raportowanie)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz logike priorytetu CWU wzgledem ogrzewania
- ustal harmonogram i temperatury ladowania
- _Dowody:_ konfiguracja harmonogramow w BMS, konfiguracja logiki w BMS, konfiguracja taryf/OpenADR/SG-Ready, lista czujnikow, nastawy sterownika, odczyt z BMS, schemat hydrauliczny z priorytetem CWU, trendy nastaw vs zapotrzebowanie
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DHW-1d — Sterowanie CWU z kolektorem slonecznym i dogrzewaniem (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #30  ·  **Expected Gain:** 1.432% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie CWU z kolektorem slonecznym i dogrzewaniem (usluga DHW-1d). Maksymalne wykorzystanie ciepla ze slonca do przygotowania CWU, z inteligentnym dogrzewaniem tylko wtedy, gdy energia sloneczna nie wystarcza. Znaczenie energetyczne: Priorytet solarny minimalizuje uzycie zrodla konwencjonalnego; inteligentne dogrzewanie unika niepotrzebnego grzania, gdy zapowiada sie naslonecznienie.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.418% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.238% |
| Elastycznosc energetyczna | sredni | 2 | 0.776% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Kolektory sloneczne (solar thermal) (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Dane pogodowe / prognoza (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ dodanie prognozowego sterowania dogrzewaniem, optymalizacja rozmieszczenia czujnikow, integracja z BMS i raportowaniem uzysku
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ciepla woda uzytkowa
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.776%); Efektywnosc energetyczna (+0.418%); Wygoda obslugi (+0.238%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Kolektory sloneczne (solar thermal), Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Sterowanie wg zapotrzebowania (16 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- Powiazane uslugi: DHW-1b (dogrzewanie z kotla), DHW-2b (sekwencja), DHW-3 (raportowanie uzysku)

**6. Verification.**

- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc kolektorow i logike priorytetu solarnego.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz priorytet solarny wzgledem dogrzewania
- _Dowody:_ DTR, konfiguracja BMS/platformy, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, lista czujnikow, nastawy regulatora solarnego, odczyt z BMS, opis logiki optymalizacji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DHW-2b — Kaskada / sekwencja zrodel CWU (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #21  ·  **Expected Gain:** 1.581% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Kaskada / sekwencja zrodel CWU (usluga DHW-2b). Optymalny dobor i kolejnosc zrodel przygotowania CWU (np. PC + grzalka + kolektor) dla najnizszego kosztu i wysokiej sprawnosci. Znaczenie energetyczne: Wlasciwa kolejnosc zrodel (najpierw solar/PC, potem szczytowe) maksymalizuje udzial taniej energii i obniza koszt CWU.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.418% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | wysoki | 3 | 1.163% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterownik kaskady/sekwencji zrodel (od FL1, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie menedzera zrodel z kryterium kosztu, priorytet OZE/PC przed grzalka, rownowazenie motogodzin
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ciepla woda uzytkowa
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.163%); Efektywnosc energetyczna (+0.418%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterownik kaskady/sekwencji zrodel
- Funkcje wspoldzielone miedzydomenowo: Sterownik kaskady/sekwencji zrodel (3 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: DHW-1a/DHW-1b/DHW-1d (poszczegolne zrodla), DHW-3 (raportowanie)

**6. Verification.**

- Sprawdz logike sekwencjonowania i kryteria przelaczania zrodel.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz logike priorytetow i warunki przelaczania
- ustal liczbe/typy zrodel CWU
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja kaskady w BMS, konfiguracja priorytetow, konfiguracja taryf/OpenADR/SG-Ready, lista licznikow, odczyt z BMS, opis logiki optymalizacji, schemat zrodel CWU
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DHW-3 — Raportowanie pracy systemu CWU (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #16  ·  **Expected Gain:** 2.872% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie pracy systemu CWU (usluga DHW-3). Dostarczanie danych o zuzyciu i sprawnosci przygotowania CWU dla monitoringu, wykrywania strat (np. cyrkulacji) i optymalizacji. Znaczenie energetyczne: Ujawnia ukryte straty (np. przewymiarowana cyrkulacja, przegrzewanie) i umozliwia korekte nastaw — czesto szybkie, bezkosztowe oszczednosci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.139% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 1.661% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 1.071% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar energii/ciepla/chlodu (od FL1, engineering_assumption)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Wykrywanie usterek (FDD) (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ montaz cieplomierzy/wodomierzy CWU, monitoring strat cyrkulacji, dashboard i alarmy odchylen
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ciepla woda uzytkowa
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+1.661%); Informacja dla uzytkownikow (+0.952%); Efektywnosc energetyczna (+0.139%); Wygoda obslugi (+0.119%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji, Pomiar energii/ciepla/chlodu
- Funkcje wspoldzielone miedzydomenowo: Pomiar energii/ciepla/chlodu (8 uslug), Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: DHW-1a/DHW-1b/DHW-1d (zrodla danych), MC-13 (centralne raportowanie), MC-4 (detekcja usterek)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- _Dowody:_ dashboardy zuzycia CWU, dostep do platformy, eksport trendow, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja powiadomien, lista alarmow, lista licznikow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Dynamiczna obudowa budynku (`dynamic_building_envelope`)

### DE-1 — Sterowanie zacienieniem / roletami (FLmax 4)

**Priorytet:** Critical  ·  **Ranking:** #17  ·  **Expected Gain:** 2.717% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie zacienieniem / roletami (usluga DE-1). Automatyczne sterowanie oslonami przeciwslonecznymi (rolety, zaluzje, markizy), aby ograniczac zyski ciepla latem, wykorzystywac je zima i chronic przed olsnieniem. Znaczenie energetyczne: Zacienienie redukuje szczyty chlodnicze latem i zyski ciepla, a zima pozwala na darmowe zyski sloneczne; wplywa tez na zapotrzebowanie na oswietlenie.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.500% |
| Komfort | wysoki | 3 | 0.800% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | wysoki | 3 | 1.000% |
| Eksploatacja | wysoki | 3 | 0.417% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Napedy zacienienia/rolet (od FL1, official_methodology)
- Dane pogodowe / prognoza (od FL1, official_methodology)
- Pomiar temperatury (od FL2, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, engineering_assumption)
- Sledzenie pozycji slonca (od FL3, official_methodology)
- Integracja z BMS/BACS (od FL4, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ automatyzacja rolet z czujnikami naslonecznienia/wiatru, sterowanie wg pozycji slonca, koordynacja z oswietleniem i HVAC
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Dynamiczna obudowa budynku
- Kryteria, ktore wzrosna: Zdrowie i dostepnosc (+1.000%); Komfort (+0.800%); Efektywnosc energetyczna (+0.500%); Wygoda obslugi (+0.417%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Napedy zacienienia/rolet
- Funkcje wspoldzielone miedzydomenowo: Dane pogodowe / prognoza (13 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Integracja z BMS/BACS (12 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: L-2 (swiatlo dzienne), DE-2 (okna/HVAC), C-1a (redukcja zyskow ciepla)

**6. Verification.**

- Sprawdz logike wg azymutu/wysokosci slonca.
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc napedow oslon i ich sterowanie.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- _Dowody:_ DTR, architektura BMS, konfiguracja BMS/platformy, konfiguracja logiki pozycji slonca, konfiguracja stacji pogodowej/feedu, lista czujnikow, lista integracji, nastawy logiki naslonecznienia
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DE-2 — Sterowanie otwieraniem okien z HVAC (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #38  ·  **Expected Gain:** 1.478% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie otwieraniem okien z HVAC (usluga DE-2). Koordynacja otwierania/zamykania okien z praca ogrzewania, chlodzenia i wentylacji, aby umozliwic przewietrzanie bez marnowania energii. Znaczenie energetyczne: Blokowanie HVAC przy otwartych oknach eliminuje typowe marnotrawstwo; sterowane przewietrzanie umozliwia darmowe chlodzenie nocne.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.333% |
| Komfort | sredni | 2 | 0.533% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | niski | 1 | 0.333% |
| Eksploatacja | sredni | 2 | 0.278% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Integracja z BMS/BACS (od FL1, engineering_assumption)
- Detekcja otwarcia okna (od FL1, official_methodology)
- Napedy okien/klap (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ montaz kontaktronow i blokady HVAC, automatyzacja przewietrzania nocnego, koordynacja z wentylacja mechaniczna
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Dynamiczna obudowa budynku
- Kryteria, ktore wzrosna: Komfort (+0.533%); Efektywnosc energetyczna (+0.333%); Zdrowie i dostepnosc (+0.333%); Wygoda obslugi (+0.278%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Detekcja otwarcia okna, Integracja z BMS/BACS
- Funkcje wspoldzielone miedzydomenowo: Integracja z BMS/BACS (12 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: H-1a/C-1a (blokada grzania/chlodzenia strefy), V-3 (free-cooling/przewietrzanie), DE-1 (zacienienie)

**6. Verification.**

- Sprawdz detekcje otwarcia okien i powiazanie z HVAC.
- Sprawdz obecnosc napedow okien/klap i ich sterowanie.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- sprawdz detekcje otwarcia okien i blokade HVAC
- ustal, czy istnieje sterowane przewietrzanie
- _Dowody:_ DTR, architektura BMS, konfiguracja BMS/platformy, lista integracji, logika blokady w BMS, odczyt stanu okien, opis logiki optymalizacji, schemat kontaktronow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### DE-4 — Raportowanie pracy dynamicznej powloki budynku (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #31  ·  **Expected Gain:** 1.925% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie pracy dynamicznej powloki budynku (usluga DE-4). Dostarczanie informacji o dzialaniu oslon i elementow ruchomych powloki, aby monitorowac ich skutecznosc i wykrywac usterki. Znaczenie energetyczne: Monitoring ujawnia niedzialajace/zablokowane oslony i pozwala utrzymac ich wklad w redukcje zyskow ciepla i komfort.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 0.833% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 1.091% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Informacja zwrotna z napedow (od FL1, official_methodology)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Wykrywanie usterek (FDD) (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ napedy z informacja zwrotna o pozycji, dashboard i alarmy usterek oslon, analiza skutecznosci zacienienia
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Dynamiczna obudowa budynku
- Kryteria, ktore wzrosna: Informacja dla uzytkownikow (+0.952%); Utrzymanie i predykcja usterek (+0.833%); Wygoda obslugi (+0.139%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Informacja zwrotna z napedow, Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: DE-1 (zacienienie), DE-2 (okna), MC-13 (centralne raportowanie), MC-4 (detekcja usterek)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- Sprawdz, czy napedy zwracaja pozycje/stan do systemu.
- _Dowody:_ dashboard stanu powloki, dostep do platformy, eksport trendow, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja informacji zwrotnej, konfiguracja powiadomien, lista alarmow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Ladowanie pojazdow elektrycznych (`electric_vehicle_charging`)

### EV-15 — Infrastruktura i moc ladowania EV (FLmax 4)

**Priorytet:** Low  ·  **Ranking:** #53  ·  **Expected Gain:** 0.417% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Infrastruktura i moc ladowania EV (usluga EV-15). Zapewnienie odpowiedniej liczby i mocy punktow ladowania pojazdow elektrycznych z inteligentnym zarzadzaniem moca (nieprzeciazanie przylacza). Znaczenie energetyczne: Dynamiczny load balancing pozwala ladowac wiecej pojazdow bez rozbudowy przylacza i unika drogich szczytow mocy; umozliwia ladowanie z nadwyzek OZE.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.417% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Punkt ladowania EV (od FL1, official_methodology)
- Harmonogramy czasowe (od FL2, official_methodology)
- Zarzadzanie moca ladowania (load balancing) (od FL3, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL4, engineering_assumption)
- Optymalizacja autokonsumpcji (od FL4, engineering_assumption)
- _Kierunki modernizacji:_ wdrozenie dynamicznego load balancingu, integracja ladowania z nadwyzka PV i taryfami, rozbudowa o OCPP i priorytety
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ladowanie pojazdow elektrycznych
- Kryteria, ktore wzrosna: Wygoda obslugi (+0.417%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Punkt ladowania EV
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Optymalizacja autokonsumpcji (4 uslug)
- Powiazane uslugi: EV-16 (bilansowanie sieci), EV-17 (informacja/laczonosc), E-4 (autokonsumpcja PV), MC-25 (smart grid)

**6. Verification.**

- Sprawdz dzialanie load balancingu wzgledem mocy przylacza.
- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc, liczbe i moc punktow ladowania.
- Sprawdz reakcje odbiornikow na nadwyzke produkcji.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz load balancing wzgledem przylacza
- _Dowody:_ DTR stacji, konfiguracja EMS/priorytetow, konfiguracja harmonogramow w BMS, konfiguracja load balancing/OCPP, konfiguracja taryf/OpenADR/SG-Ready, schemat instalacji EV i przylacza, schemat przylacza, trendy autokonsumpcji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### EV-16 — Bilansowanie sieci przez ladowanie EV (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #35  ·  **Expected Gain:** 1.528% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Bilansowanie sieci przez ladowanie EV (usluga EV-16). Wykorzystanie ladowania (i ewentualnie rozladowania V2G) pojazdow do wspierania sieci — przesuwanie poboru, redukcja szczytow, uslugi elastycznosci. Znaczenie energetyczne: EV to duzy, przesuwalny odbiornik (i potencjalny magazyn) — jego elastycznosc obniza koszty, szczyty i wspiera stabilnosc sieci; wysoka waga w SRI.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.278% |
| Elastycznosc energetyczna | wysoki | 3 | 1.250% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, official_methodology)
- Pomiar dwukierunkowy (od FL2, official_methodology)
- _Kierunki modernizacji:_ wdrozenie smart charging wg taryf/sieci, pilotaz V2G/V2B, integracja z EMS i uslugami elastycznosci
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Ladowanie pojazdow elektrycznych
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.250%); Wygoda obslugi (+0.278%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Interfejs sygnalow sieci/taryf
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Pomiar dwukierunkowy (6 uslug)
- Powiazane uslugi: EV-15 (infrastruktura/moc), E-3 (magazyn), MC-25 (smart grid), MC-29 (override DSM)

**6. Verification.**

- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz reakcje ladowania na taryfy/sygnaly sieci
- ustal, czy dostepne jest V2G/V2B
- zweryfikuj uslugi sieciowe i rozliczenia (poziom 2)
- _Dowody:_ DTR/tabliczka licznika, konfiguracja smart charging/V2G, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu, trendy poboru EV vs ceny/sygnaly, trendy poboru vs sygnaly, umowa dystrybucyjna, umowy uslug elastycznosci
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### EV-17 — Informacja i laczonosc ladowania EV (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #32  ·  **Expected Gain:** 1.508% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Informacja i laczonosc ladowania EV (usluga EV-17). Udostepnianie uzytkownikom i systemom informacji o ladowaniu (status, koszt, dostepnosc) oraz laczonosci umozliwiajacej zdalne zarzadzanie i rozliczenia. Znaczenie energetyczne: Laczonosc i informacja umozliwiaja smart charging, rozliczenia i optymalizacje uzycia — warunek zaawansowanego zarzadzania i elastycznosci EV.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 1.091% |
| Elastycznosc energetyczna | niski | 1 | 0.417% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Laczonosc ladowania (OCPP/backend) (od FL2, official_methodology)
- Zdalny dostep (od FL2, engineering_assumption)
- _Kierunki modernizacji:_ wdrozenie OCPP i backendu zarzadzania, aplikacja/portal dla uzytkownikow, autoryzacja i rozliczenia sesji
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Ladowanie pojazdow elektrycznych
- Kryteria, ktore wzrosna: Informacja dla uzytkownikow (+0.952%); Elastycznosc i magazynowanie energii (+0.417%); Wygoda obslugi (+0.139%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Zdalny dostep (2 uslug)
- Powiazane uslugi: EV-15 (infrastruktura), EV-16 (smart charging), MC-13 (raportowanie)

**6. Verification.**

- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz laczonosc stacji i integracje z backendem.
- Sprawdz mozliwosc bezpiecznego zdalnego dostepu do systemu.
- sprawdz laczonosc stacji (OCPP/backend)
- ustal dostepnosc informacji dla uzytkownikow (status/koszt)
- zweryfikuj autoryzacje i rozliczenia (poziom 2)
- _Dowody:_ dostep do platformy, konfiguracja OCPP/backendu, konfiguracja dostepu zdalnego, raporty sesji, raporty sesji ladowania, zrzut dashboardu, zrzut portalu/aplikacji, zrzuty aplikacji/portalu
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Elektrycznosc (`electricity`)

### E-11 — Raportowanie pracy magazynu energii (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #42  ·  **Expected Gain:** 1.072% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie pracy magazynu energii (usluga E-11). Dostarczanie danych o pracy magazynu energii (naladowanie, cykle, sprawnosc), aby monitorowac stan, kondycje i efekty ekonomiczne. Znaczenie energetyczne: Monitoring magazynu pozwala ocenic realne korzysci, kondycje baterii i skutecznosc strategii ladowania — warunek optymalizacji.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.198% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 0.480% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.393% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Magazyn energii elektrycznej (od FL1, engineering_assumption)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie dashboardu magazynu, monitoring degradacji i alarmy, raporty oplacalnosci
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+0.480%); Informacja dla uzytkownikow (+0.318%); Efektywnosc energetyczna (+0.198%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Magazyn energii elektrycznej, Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-3 (magazyn), E-12 (zuzycie), MC-13 (centralne raportowanie)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc magazynu energii i strategie sterowania.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- sprawdz monitoring SoC/cykli i archiwizacje
- _Dowody:_ DTR magazynu, dashboard magazynu, dostep do platformy, eksport trendow, konfiguracja BMS/platformy, konfiguracja EMS, konfiguracja historiana, konfiguracja powiadomien
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-12 — Raportowanie zuzycia energii elektrycznej (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #28  ·  **Expected Gain:** 1.468% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie zuzycia energii elektrycznej (usluga E-12). Pomiar i prezentacja zuzycia energii elektrycznej (najlepiej z podzialem na obwody/odbiory), aby zarzadzac energia i wykrywac marnotrawstwo. Znaczenie energetyczne: Podlicznikowanie ujawnia najwiekszych odbiorcow i marnotrawstwo (np. praca poza godzinami), umozliwiajac celowane oszczednosci i zarzadzanie szczytami.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.594% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 0.480% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.393% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar energii/ciepla/chlodu (od FL1, official_methodology)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, engineering_assumption)
- Podlicznikowanie (submetering) (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie submeteringu kluczowych obwodow, dashboard i alarmy odchylen, analiza baseloadu i szczytow
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.594%); Utrzymanie i predykcja usterek (+0.480%); Informacja dla uzytkownikow (+0.318%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji, Pomiar energii/ciepla/chlodu
- Funkcje wspoldzielone miedzydomenowo: Pomiar energii/ciepla/chlodu (8 uslug), Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-2 (produkcja), E-11 (magazyn), MC-13 (centralne raportowanie), MC-4 (detekcja usterek)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zakres submeteringu kluczowych odbiorow.
- _Dowody:_ dashboard zuzycia energii, dostep do platformy, eksport profili mocy, eksport trendow, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja powiadomien, lista alarmow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-2 — Raportowanie produkcji energii (PV/OZE) (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #34  ·  **Expected Gain:** 1.072% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie produkcji energii (PV/OZE) (usluga E-2). Monitorowanie i prezentacja produkcji energii z lokalnych zrodel (np. PV), aby ocenic uzysk, wykrywac usterki i optymalizowac autokonsumpcje. Znaczenie energetyczne: Bez pomiaru produkcji nie da sie zarzadzac autokonsumpcja ani wykryc spadku uzysku (zabrudzenia, awarie) — podstawa optymalizacji OZE.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.198% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 0.480% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.393% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Monitoring produkcji PV/OZE (od FL1, official_methodology)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie monitoringu per string, dashboard i alarmy uzysku, integracja prognozy produkcji
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+0.480%); Informacja dla uzytkownikow (+0.318%); Efektywnosc energetyczna (+0.198%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Monitoring produkcji PV/OZE, Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-4 (autokonsumpcja), E-3 (magazyn), E-12 (zuzycie), MC-13 (centralne raportowanie)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz monitoring produkcji (najlepiej per string/falownik).
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- sprawdz monitoring falownikow i archiwizacje produkcji
- _Dowody:_ dashboard produkcji, dashboard produkcji PV, dostep do platformy, eksport trendow, eksport uzysku dziennego/miesiecznego, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja monitoringu falownikow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-3 — Magazynowanie energii elektrycznej (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #41  ·  **Expected Gain:** 1.140% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Magazynowanie energii elektrycznej (usluga E-3). Gromadzenie lokalnie wytworzonej energii (np. z PV) w magazynie, aby zwiekszyc autokonsumpcje, obnizyc szczyty i wspierac siec. Znaczenie energetyczne: Magazyn zwieksza autokonsumpcje PV, redukuje szczyty mocy i koszty; kluczowy dla elastycznosci energetycznej (wysoka waga w SRI).

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.151% |
| Elastycznosc energetyczna | wysoki | 3 | 0.989% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Magazyn energii elektrycznej (od FL1, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL2, official_methodology)
- Optymalizacja autokonsumpcji (od FL2, engineering_assumption)
- Pomiar dwukierunkowy (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ dodanie magazynu do instalacji PV, wdrozenie peak shaving w EMS, integracja z uslugami sieciowymi
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.989%); Wygoda obslugi (+0.151%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Magazyn energii elektrycznej
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Optymalizacja autokonsumpcji (4 uslug), Pomiar dwukierunkowy (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-2 (produkcja), E-4 (autokonsumpcja), E-11 (raportowanie magazynu), MC-25 (smart grid)

**6. Verification.**

- Sprawdz obecnosc magazynu energii i strategie sterowania.
- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz reakcje odbiornikow na nadwyzke produkcji.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz logike ladowania/rozladowania (autokonsumpcja/taryfy/szczyty)
- _Dowody:_ DTR magazynu, DTR magazynu/falownika, DTR/tabliczka licznika, konfiguracja BMS/platformy, konfiguracja EMS, konfiguracja EMS/priorytetow, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-4 — Optymalizacja autokonsumpcji energii z PV (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #36  ·  **Expected Gain:** 1.140% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Optymalizacja autokonsumpcji energii z PV (usluga E-4). Maksymalne zuzycie na miejscu energii wyprodukowanej lokalnie (PV), przez sterowanie odbiornikami zgodnie z biezaca produkcja. Znaczenie energetyczne: Autokonsumpcja jest zwykle bardziej oplacalna niz oddawanie do sieci — inteligentne sterowanie odbiornikami znaczaco podnosi jej udzial.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.151% |
| Elastycznosc energetyczna | wysoki | 3 | 0.989% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Lokalna generacja (PV/CHP) (od FL1, engineering_assumption)
- Optymalizacja autokonsumpcji (od FL1, official_methodology)
- Integracja z BMS/BACS (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie EMS koordynujacego odbiorniki wg PV, priorytetyzacja CWU/PC/EV/magazyn, prognozowa optymalizacja
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.989%); Wygoda obslugi (+0.151%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Lokalna generacja (PV/CHP), Optymalizacja autokonsumpcji
- Funkcje wspoldzielone miedzydomenowo: Optymalizacja autokonsumpcji (4 uslug), Integracja z BMS/BACS (12 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-2 (produkcja), E-3 (magazyn), H-2b/DHW-1a (odbiorniki PC/CWU), EV-15/EV-16 (ladowanie EV)

**6. Verification.**

- Sprawdz obecnosc i moc lokalnej generacji.
- Sprawdz reakcje odbiornikow na nadwyzke produkcji.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- sprawdz, czy odbiorniki reaguja na nadwyzke PV
- ustal priorytety i koordynacje odbiornikow
- _Dowody:_ DTR instalacji PV/CHP, architektura BMS, konfiguracja BMS/platformy, konfiguracja EMS/priorytetow, lista integracji, logi sterowania odbiornikami wg PV, opis logiki optymalizacji, schemat elektryczny
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-5 — Sterowanie kogeneracja (CHP) (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #51  ·  **Expected Gain:** 1.131% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie kogeneracja (CHP) (usluga E-5). Optymalna praca ukladu skojarzonego (produkcja pradu i ciepla) tak, aby maksymalizowac korzysc z jednoczesnej produkcji energii i ciepla. Znaczenie energetyczne: CHP jest najbardziej oplacalny przy jednoczesnym wykorzystaniu ciepla i pradu; inteligentne sterowanie dopasowuje prace do zapotrzebowania i cen.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.396% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.076% |
| Elastycznosc energetyczna | sredni | 2 | 0.659% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Lokalna generacja (PV/CHP) (od FL1, engineering_assumption)
- Modulacja mocy zrodla (od FL1, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL2, official_methodology)
- Magazyn ciepla/chlodu (bufor/TES) (od FL2, engineering_assumption)
- _Kierunki modernizacji:_ sterowanie CHP wg zapotrzebowania cieplnego i cen, dodanie bufora, integracja z EMS/microgrid
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.659%); Efektywnosc energetyczna (+0.396%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Lokalna generacja (PV/CHP), Modulacja mocy zrodla
- Funkcje wspoldzielone miedzydomenowo: Modulacja mocy zrodla (4 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug)
- Powiazane uslugi: H-1f (bufor), H-2d (kaskada zrodel), E-8 (praca w microgrid), E-2 (raportowanie produkcji)

**6. Verification.**

- Sprawdz obecnosc i moc lokalnej generacji.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz zdolnosc modulacji mocy i jej wykorzystanie.
- sprawdz wspolprace z buforem
- ustal obecnosc CHP i logike sterowania (cieplo/energia)
- _Dowody:_ DTR, DTR CHP, DTR instalacji PV/CHP, DTR/tabliczka zrodla, konfiguracja sterowania, konfiguracja taryf/OpenADR/SG-Ready, schemat elektryczny, schemat hydrauliczny z buforem
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### E-8 — Wsparcie pracy (mikro)sieci (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #44  ·  **Expected Gain:** 1.216% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Wsparcie pracy (mikro)sieci (usluga E-8). Umozliwienie budynkowi pracy w roznych trybach sieci (np. wyspowym), wspierajac lokalna mikrosiec i ciaglosc zasilania. Znaczenie energetyczne: Wspiera integracje OZE i odpornosc (rezyliencje) zasilania; umozliwia lokalny bilans energii i uslugi dla sieci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.227% |
| Elastycznosc energetyczna | wysoki | 3 | 0.989% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, official_methodology)
- Magazyn energii elektrycznej (od FL2, engineering_assumption)
- Kontroler mikrosieci / praca wyspowa (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie falownikow gridformujacych i EMS microgrid, automatyczne przelaczanie na wyspe, koordynacja zrodel/magazynu
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Elektrycznosc
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+0.989%); Wygoda obslugi (+0.227%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Interfejs sygnalow sieci/taryf
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: E-3 (magazyn), E-5 (CHP), E-2 (produkcja), MC-25 (smart grid)

**6. Verification.**

- Sprawdz obecnosc magazynu energii i strategie sterowania.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz zdolnosc pracy wyspowej i koordynacje zrodel.
- sprawdz koordynacje zrodel/magazynu
- ustal zdolnosc pracy wyspowej i tryby sieci
- _Dowody:_ DTR magazynu, konfiguracja BMS/platformy, konfiguracja EMS, konfiguracja kontrolera, konfiguracja taryf/OpenADR/SG-Ready, opis logiki optymalizacji, schemat microgrid/SZR, testy przelaczania
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Ogrzewanie (`heating`)

### H-1a — Sterowanie ogrzewaniem w pomieszczeniach (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #12  ·  **Expected Gain:** 2.741% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie ogrzewaniem w pomieszczeniach (usluga H-1a). Dostarczanie ciepla do pomieszczen dokladnie w takiej ilosci i wtedy, kiedy jest potrzebne, aby utrzymac komfort przy minimalnym zuzyciu energii. Znaczenie energetyczne: Jedna z najbardziej oplacalnych uslug — indywidualna regulacja pomieszczen i detekcja obecnosci ograniczaja przegrzewanie i eliminuja grzanie pustych stref, dajac typowo kilkanascie procent oszczednosci na ogrzewaniu.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.698% |
| Komfort | sredni | 2 | 0.222% |
| Utrzymanie | niski | 1 | 1.060% |
| Bezpieczenstwo | sredni | 2 | 0.533% |
| Eksploatacja | wysoki | 3 | 0.227% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Centralne sterowanie automatyczne (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, official_methodology)
- Integracja z BMS/BACS (od FL3, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL3, official_methodology)
- Detekcja obecnosci (od FL4, official_methodology)
- _Kierunki modernizacji:_ wymiana glowic recznych na elektroniczne komunikacyjne, dodanie czujnikow obecnosci w salach konferencyjnych/biurach, integracja termostatow z BMS i wprowadzenie harmonogramow, strefowanie ogrzewania podlogowego
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+1.060%); Efektywnosc energetyczna (+0.698%); Zdrowie i dostepnosc (+0.533%); Wygoda obslugi (+0.227%); Komfort (+0.222%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Centralne sterowanie automatyczne, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Centralne sterowanie automatyczne (4 uslug), Pomiar temperatury (17 uslug), Sterowanie strefowe / indywidualne (8 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Detekcja obecnosci (7 uslug)
- Powiazane uslugi: H-1c (temperatura zasilania), H-2a/H-2b (zrodlo ciepla), MC-3 (harmonogramy/run-time), DE-2 (blokada grzania przy otwartym oknie)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc automatycznej regulacji zamiast sterowania recznego.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz w systemie, czy sterowniki komunikuja sie z BMS (widocznosc nastaw i temperatur).
- _Dowody:_ architektura BMS, konfiguracja sterownika/BMS, lista czujnikow, lista czujnikow PIR/obecnosci, lista integracji, lista punktow (I/O) w sterowniku, lista urzadzen na magistrali, nastawy per strefa w BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-1b — Sterowanie ogrzewaniem plaszczyznowym TABS (FLmax 3)

**Priorytet:** Critical  ·  **Ranking:** #6  ·  **Expected Gain:** 2.746% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie ogrzewaniem plaszczyznowym TABS (usluga H-1b). Regulacja ogrzewania aktywowanego termicznie w konstrukcji budynku (betonowe rdzenie/stropy) tak, aby wykorzystac bezwladnosc masy do stabilnego, taniego ogrzewania. Znaczenie energetyczne: TABS pozwala grzac woda o niskiej temperaturze i przesuwac pobor energii w czasie (magazyn ciepla w masie), co sprzyja pompom ciepla i taryfom nocnym oraz obniza szczyty mocy.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | sredni | 2 | 0.222% |
| Utrzymanie | niski | 1 | 1.060% |
| Bezpieczenstwo | sredni | 2 | 0.533% |
| Eksploatacja | wysoki | 3 | 0.465% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Centralne sterowanie automatyczne (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Dane pogodowe / prognoza (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ dodanie regulacji predykcyjnej wg pogody i oblozenia, rozdzielenie stref TABS, integracja z taryfami/sygnalami sieci
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+1.060%); Zdrowie i dostepnosc (+0.533%); Efektywnosc energetyczna (+0.466%); Informacja dla uzytkownikow (+0.238%); Wygoda obslugi (+0.227%); Komfort (+0.222%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Centralne sterowanie automatyczne, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Centralne sterowanie automatyczne (4 uslug), Pomiar temperatury (17 uslug), Sterowanie wg zapotrzebowania (16 uslug), Sterowanie strefowe / indywidualne (8 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- Powiazane uslugi: H-1c (temperatura zasilania), C-1b (TABS w trybie chlodzenia), C-1f (blokada grzanie/chlodzenie), MC-30 (optymalizacja predykcyjna)

**6. Verification.**

- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc automatycznej regulacji zamiast sterowania recznego.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja krzywej grzewczej w BMS, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, konfiguracja sterownika/BMS, lista czujnikow, nastawy per strefa w BMS, odczyt z BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-1c — Regulacja temperatury czynnika grzewczego (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #43  ·  **Expected Gain:** 0.652% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Regulacja temperatury czynnika grzewczego (usluga H-1c). Dopasowanie temperatury wody/powietrza w instalacji do rzeczywistego zapotrzebowania budynku (kompensacja pogodowa), zamiast grzania stala, wysoka temperatura. Znaczenie energetyczne: Nizsza temperatura zasilania to mniejsze straty dystrybucji i wyzsza sprawnosc zrodel kondensacyjnych oraz pomp ciepla — jeden z podstawowych mechanizmow oszczednosci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | niski | 1 | 0.111% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.076% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar temperatury (od FL1, engineering_assumption)
- Dane pogodowe / prognoza (od FL1, official_methodology)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- _Kierunki modernizacji:_ wdrozenie/optymalizacja krzywej grzewczej, obnizenie temperatury zasilania po dociepleniu, regulacja wg zapotrzebowania stref
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.466%); Komfort (+0.111%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug)
- Powiazane uslugi: H-1a/H-1b (odbior ciepla w strefach), H-1d (pompy obiegowe), H-2a/H-2b (zrodlo)

**6. Verification.**

- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz, czy istnieje czujnik zewnetrzny i aktywna krzywa grzewcza
- ustal, czy regulacja reaguje na zapotrzebowanie stref (poziom 2)
- zweryfikuj, czy temperatura zasilania zmienia sie z pogoda (trendy)
- _Dowody:_ konfiguracja krzywej grzewczej, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, lista czujnikow, odczyt z BMS, schemat wezla cieplnego, trendy nastaw vs zapotrzebowanie, trendy temperatur zasilania vs zewnetrznej
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-1d — Sterowanie pompami obiegowymi ogrzewania (FLmax 4)

**Priorytet:** Low  ·  **Ranking:** #52  ·  **Expected Gain:** 0.466% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie pompami obiegowymi ogrzewania (usluga H-1d). Ograniczenie energii elektrycznej pomp obiegowych przez dopasowanie ich pracy do rzeczywistego przeplywu wymaganego przez instalacje. Znaczenie energetyczne: Pompy o zmiennej predkosci sterowane wg zapotrzebowania zuzywaja wielokrotnie mniej energii niz pompy staloobrotowe pracujace ciagle — szybki zwrot z modernizacji.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterowanie wg zapotrzebowania (od FL1, official_methodology)
- Naped o zmiennej predkosci (falownik) (od FL2, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL4, official_methodology)
- _Kierunki modernizacji:_ wymiana pomp staloobrotowych na elektroniczne, przejscie na regulacje proporcjonalna/wg zapotrzebowania, wylaczanie pomp poza sezonem/przy braku rozbioru
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.466%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterowanie wg zapotrzebowania
- Funkcje wspoldzielone miedzydomenowo: Sterowanie wg zapotrzebowania (16 uslug), Naped o zmiennej predkosci (falownik) (3 uslug), Komunikacja cyfrowa sterownikow (10 uslug)
- Powiazane uslugi: H-1a (odbior w strefach generuje zapotrzebowanie), H-1c (temperatura zasilania), H-3 (raportowanie pracy)

**6. Verification.**

- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz obecnosc falownikow i tryb regulacji (nie stala predkosc).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz typ pomp (staloobrotowe vs elektroniczne)
- ustal tryb regulacji (stale/zmienne cisnienie, wg zapotrzebowania)
- zweryfikuj, czy pompa wylacza sie przy braku zapotrzebowania
- _Dowody:_ DTR pomp/wentylatorow, konfiguracja logiki w BMS, lista urzadzen na magistrali, nastawy trybu pracy pompy, schemat magistrali (KNX/BACnet/Modbus), tabliczki/DTR pomp, trendy nastaw vs zapotrzebowanie, trendy poboru mocy/predkosci pompy
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-1f — Magazyn ciepla (bufor) dla ogrzewania (FLmax 3)

**Priorytet:** Critical  ·  **Ranking:** #5  ·  **Expected Gain:** 2.951% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Magazyn ciepla (bufor) dla ogrzewania (usluga H-1f). Gromadzenie ciepla w zasobniku, aby oddzielic prace zrodla od chwilowego zapotrzebowania — stabilizacja pracy, wykorzystanie tanszej energii i integracja OZE. Znaczenie energetyczne: Bufor pozwala pompie ciepla/kotlowi pracowac w optymalnym punkcie i przesuwac pobor energii na godziny tanie lub z nadwyzka PV, obnizajac koszty i szczyty mocy.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | sredni | 2 | 2.485% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Harmonogramy czasowe (od FL1, engineering_assumption)
- Pomiar temperatury (od FL1, engineering_assumption)
- Magazyn ciepla/chlodu (bufor/TES) (od FL1, official_methodology)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- _Kierunki modernizacji:_ dodanie bufora do instalacji z pompa ciepla, sterowanie ladowaniem wg nadwyzki PV i taryf, poprawa stratyfikacji zbiornika
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+2.485%); Efektywnosc energetyczna (+0.466%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Magazyn ciepla/chlodu (bufor/TES), Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Pomiar temperatury (17 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug), Sterowanie wg zapotrzebowania (16 uslug), Interfejs sygnalow sieci/taryf (19 uslug)
- Powiazane uslugi: H-2a/H-2b (zrodlo ciepla), H-4 (elastycznosc/siec), E-3 (magazyn energii elektrycznej — komplementarnosc)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz logike ladowania (harmonogram, temperatura, sygnaly zewnetrzne)
- _Dowody:_ DTR, konfiguracja harmonogramow w BMS, konfiguracja logiki ladowania, konfiguracja logiki w BMS, konfiguracja taryf/OpenADR/SG-Ready, lista czujnikow, odczyt z BMS, schemat hydrauliczny z buforem
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-2a — Sterowanie zrodlem ciepla (poza pompami ciepla) (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #47  ·  **Expected Gain:** 0.688% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie zrodlem ciepla (poza pompami ciepla) (usluga H-2a). Regulacja pracy kotla/wymiennika tak, aby produkowal cieplo o odpowiedniej temperaturze i mocy zgodnie z zapotrzebowaniem, przy wysokiej sprawnosci. Znaczenie energetyczne: Dostosowanie temperatury i mocy zrodla do potrzeb podnosi sprawnosc (zwlaszcza kondensacja) i ogranicza taktowanie oraz straty postojowe.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | sredni | 2 | 0.222% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Modulacja mocy zrodla (od FL1, official_methodology)
- Dane pogodowe / prognoza (od FL1, engineering_assumption)
- Integracja z BMS/BACS (od FL2, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- _Kierunki modernizacji:_ wymiana na kociol kondensacyjny z modulacja, wlaczenie kompensacji pogodowej, obnizenie temperatury powrotu dla kondensacji
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.466%); Komfort (+0.222%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Modulacja mocy zrodla
- Funkcje wspoldzielone miedzydomenowo: Modulacja mocy zrodla (4 uslug), Dane pogodowe / prognoza (13 uslug), Integracja z BMS/BACS (12 uslug), Sterowanie wg zapotrzebowania (16 uslug)
- Powiazane uslugi: H-1c (temperatura zasilania), H-2d (sekwencja wielu zrodel), H-3 (raportowanie)

**6. Verification.**

- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- Sprawdz zdolnosc modulacji mocy i jej wykorzystanie.
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz, czy dziala modulacja/kompensacja
- ustal typ zrodla i sposob sterowania temperatura
- _Dowody:_ DTR/tabliczka kotla, DTR/tabliczka zrodla, architektura BMS, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, lista integracji, nastawy sterownika kotlowego, odczyt z BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-2b — Sterowanie pompa ciepla (FLmax 3)

**Priorytet:** Critical  ·  **Ranking:** #4  ·  **Expected Gain:** 4.415% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie pompa ciepla (usluga H-2b). Optymalna praca pompy ciepla tak, aby maksymalizowac wspolczynnik efektywnosci (COP/SCOP) przy pokryciu zapotrzebowania na cieplo. Znaczenie energetyczne: Kazdy stopien nizszej temperatury zasilania i unikanie taktowania znaczaco podnosi COP; inteligentne sterowanie PC to duze oszczednosci energii elektrycznej.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | sredni | 2 | 0.222% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | wysoki | 3 | 3.728% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Modulacja mocy zrodla (od FL1, official_methodology)
- Dane pogodowe / prognoza (od FL1, engineering_assumption)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Pomiar temperatury (od FL2, engineering_assumption)
- Interfejs sygnalow sieci/taryf (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Magazyn ciepla/chlodu (bufor/TES) (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ obnizenie temperatury zasilania (wieksze grzejniki/podlogowka), dodanie bufora i logiki PV, aktywacja SG-Ready/sterowania taryfowego
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+3.728%); Efektywnosc energetyczna (+0.466%); Komfort (+0.222%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Modulacja mocy zrodla
- Funkcje wspoldzielone miedzydomenowo: Modulacja mocy zrodla (4 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug), Pomiar temperatury (17 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug)
- Powiazane uslugi: H-1c (temperatura zasilania), H-1f (bufor), H-4 (elastycznosc), E-4 (autokonsumpcja PV)

**6. Verification.**

- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz zdolnosc modulacji mocy i jej wykorzystanie.
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- _Dowody:_ DTR, DTR pompy ciepla, DTR/tabliczka zrodla, konfiguracja BMS/platformy, konfiguracja SG-Ready/PV, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, konfiguracja taryf/OpenADR/SG-Ready
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-2d — Kaskada / sekwencja wielu zrodel ciepla (FLmax 4)

**Priorytet:** Critical  ·  **Ranking:** #3  ·  **Expected Gain:** 4.426% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Kaskada / sekwencja wielu zrodel ciepla (usluga H-2d). Optymalne zalaczanie kilku zrodel ciepla (np. pompa ciepla + kociol szczytowy) tak, aby priorytetyzowac najtansze/najbardziej sprawne zrodlo. Znaczenie energetyczne: Wlasciwa kaskada maksymalizuje udzial taniego/OZE zrodla (np. PC) i uruchamia szczytowe tylko gdy konieczne, obnizajac koszt i emisje.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.698% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | wysoki | 3 | 3.728% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterownik kaskady/sekwencji zrodel (od FL1, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- Dane pogodowe / prognoza (od FL4, engineering_assumption)
- _Kierunki modernizacji:_ wdrozenie menedzera kaskady z kryterium kosztowym, dodanie predykcji pogody, priorytet OZE/PC przed zrodlem szczytowym
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+3.728%); Efektywnosc energetyczna (+0.698%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterownik kaskady/sekwencji zrodel
- Funkcje wspoldzielone miedzydomenowo: Sterownik kaskady/sekwencji zrodel (3 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- Powiazane uslugi: H-2a/H-2b (poszczegolne zrodla), H-1f (bufor jako element kaskady), H-3 (raportowanie udzialu zrodel)

**6. Verification.**

- Sprawdz logike sekwencjonowania i kryteria przelaczania zrodel.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- sprawdz logike priorytetow i warunki przelaczania
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja kaskady w BMS, konfiguracja priorytetow w BMS, konfiguracja stacji pogodowej/feedu, konfiguracja taryf/OpenADR/SG-Ready, lista licznikow, odczyt z BMS, opis logiki optymalizacji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-3 — Raportowanie pracy systemu grzewczego (FLmax 4)

**Priorytet:** Critical  ·  **Ranking:** #7  ·  **Expected Gain:** 4.203% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie pracy systemu grzewczego (usluga H-3). Dostarczanie informacji o zuzyciu i sprawnosci ogrzewania, aby umozliwic monitoring, wykrywanie odchylen i swiadome decyzje eksploatacyjne. Znaczenie energetyczne: Bez pomiaru nie ma zarzadzania — raportowanie ujawnia marnotrawstwo, umozliwia optymalizacje nastaw i utrzymanie sprawnosci w czasie.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.233% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | wysoki | 3 | 3.180% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.790% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Wykrywanie usterek (FDD) (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ montaz cieplomierzy i licznikow energii, wdrozenie dashboardu i alarmow odchylen, benchmarking wskaznikow kWh/m2
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+3.180%); Informacja dla uzytkownikow (+0.714%); Efektywnosc energetyczna (+0.233%); Wygoda obslugi (+0.076%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: H-1d/H-2a/H-2b (zrodla danych), MC-13 (centralne raportowanie TBS), MC-4 (detekcja usterek)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- _Dowody:_ dostep do platformy, eksport trendow, eksport trendow/raportow, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja powiadomien, lista alarmow, lista licznikow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### H-4 — Elastycznosc ogrzewania i wspolpraca z siecia (FLmax 4)

**Priorytet:** Critical  ·  **Ranking:** #2  ·  **Expected Gain:** 5.020% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Elastycznosc ogrzewania i wspolpraca z siecia (usluga H-4). Umozliwienie przesuwania poboru energii na ogrzewanie w czasie w odpowiedzi na sygnaly sieci/taryf, wspierajac stabilnosc systemu i obnizajac koszty. Znaczenie energetyczne: Elastycznosc obniza koszty (praca w tanich godzinach), zwieksza autokonsumpcje OZE i redukuje szczyty mocy — kryterium o wysokiej wadze w metodologii SRI.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.466% |
| Komfort | wysoki | 3 | 0.333% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | niski | 1 | 0.267% |
| Eksploatacja | wysoki | 3 | 0.227% |
| Elastycznosc energetyczna | wysoki | 3 | 3.728% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, official_methodology)
- Harmonogramy czasowe (od FL1, engineering_assumption)
- Magazyn ciepla/chlodu (bufor/TES) (od FL2, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Pomiar dwukierunkowy (od FL4, official_methodology)
- _Kierunki modernizacji:_ aktywacja SG-Ready i sterowania taryfowego, dodanie bufora dla przesuwania poboru, integracja z EMS i sygnalami sieci
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Ogrzewanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+3.728%); Efektywnosc energetyczna (+0.466%); Komfort (+0.333%); Zdrowie i dostepnosc (+0.267%); Wygoda obslugi (+0.227%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Interfejs sygnalow sieci/taryf
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Harmonogramy czasowe (9 uslug), Magazyn ciepla/chlodu (bufor/TES) (6 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Pomiar dwukierunkowy (6 uslug)
- Powiazane uslugi: H-1f (bufor), H-2b (pompa ciepla SG-Ready), E-3 (magazyn energii), MC-25 (integracja smart grid)

**6. Verification.**

- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc magazynu i logike jego ladowania/rozladowania.
- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz wykorzystanie bufora/masy do przesuwania poboru
- _Dowody:_ DTR, DTR/tabliczka licznika, konfiguracja BMS/platformy, konfiguracja SG-Ready/taryf w EMS, konfiguracja harmonogramow w BMS, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu, opis logiki optymalizacji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Oswietlenie (`lighting`)

### L-1a — Sterowanie oswietleniem wg obecnosci (FLmax 3)

**Priorytet:** Low  ·  **Ranking:** #45  ·  **Expected Gain:** 1.331% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie oswietleniem wg obecnosci (usluga L-1a). Zalaczanie oswietlenia tylko wtedy, gdy w pomieszczeniu sa ludzie, i wylaczanie po ich wyjsciu — eliminacja swiecenia w pustych strefach. Znaczenie energetyczne: Jedna z najprostszych i najbardziej oplacalnych oszczednosci — w korytarzach, toaletach, magazynach i biurach eliminuje znaczna czesc zbednego swiecenia.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.465% |
| Komfort | sredni | 2 | 0.533% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | sredni | 2 | 0.333% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Detekcja obecnosci (od FL1, official_methodology)
- Automatyczne zalaczanie/wylaczanie (od FL2, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL3, official_methodology)
- Sterowanie strefowe / indywidualne (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ montaz czujnikow obecnosci w strefach wspolnych, skrocenie czasow zwloki, integracja z DALI/BMS i strefowanie
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Oswietlenie
- Kryteria, ktore wzrosna: Komfort (+0.533%); Efektywnosc energetyczna (+0.465%); Wygoda obslugi (+0.333%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Detekcja obecnosci
- Funkcje wspoldzielone miedzydomenowo: Detekcja obecnosci (7 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Sterowanie strefowe / indywidualne (8 uslug)
- Powiazane uslugi: L-2 (sterowanie wg swiatla dziennego), MC-9 (detekcja obecnosci wspoldzielona), V-1a (obecnosc dla wentylacji)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz elementy wykonawcze zalaczania/wylaczania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- sprawdz obecnosc czujnikow ruchu/obecnosci i ich zasieg
- ustal logike auto-off/auto-on i czasy zwloki
- _Dowody:_ lista czujnikow PIR/obecnosci, lista urzadzen na magistrali, nastawy czasow i stref, nastawy per strefa w BMS, odczyt z BMS, schemat magistrali (KNX/BACnet/Modbus), schemat oswietlenia/DALI, schemat sterowania
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### L-2 — Sciemnianie oswietlenia wg swiatla dziennego (FLmax 4)

**Priorytet:** Medium  ·  **Ranking:** #39  ·  **Expected Gain:** 3.098% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sciemnianie oswietlenia wg swiatla dziennego (usluga L-2). Automatyczne dostosowanie mocy opraw do ilosci swiatla dziennego (daylight harvesting), aby utrzymac stale natezenie przy minimalnym zuzyciu energii. Znaczenie energetyczne: W strefach przyokiennych daylight harvesting daje duze oszczednosci, wykorzystujac darmowe swiatlo dzienne zamiast pelnej mocy opraw.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.465% |
| Komfort | wysoki | 3 | 0.800% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | wysoki | 3 | 1.333% |
| Eksploatacja | wysoki | 3 | 0.500% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Automatyczne zalaczanie/wylaczanie (od FL1, engineering_assumption)
- Pomiar natezenia swiatla (od FL1, official_methodology)
- Oprawy scieramialne (dimming) (od FL2, official_methodology)
- Sterowanie strefowe / indywidualne (od FL3, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL4, official_methodology)
- _Kierunki modernizacji:_ wymiana na oprawy DALI scieramialne, montaz czujnikow luksowych w strefach przyokiennych, koordynacja z roletami (DE-1)
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Oswietlenie
- Kryteria, ktore wzrosna: Zdrowie i dostepnosc (+1.333%); Komfort (+0.800%); Wygoda obslugi (+0.500%); Efektywnosc energetyczna (+0.465%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Automatyczne zalaczanie/wylaczanie, Pomiar natezenia swiatla
- Funkcje wspoldzielone miedzydomenowo: Sterowanie strefowe / indywidualne (8 uslug), Komunikacja cyfrowa sterownikow (10 uslug)
- Powiazane uslugi: L-1a (obecnosc), DE-1 (zacienienie wplywa na swiatlo dzienne)

**6. Verification.**

- Sprawdz czujniki luksowe w strefach przyokiennych i ich kalibracje.
- Sprawdz elementy wykonawcze zalaczania/wylaczania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz obecnosc opraw scieramialnych i regulacje plynna.
- sprawdz obecnosc czujnikow luksowych i stref przyokiennych
- _Dowody:_ lista czujnikow luksowych, lista opraw, lista urzadzen na magistrali, nastawy per strefa w BMS, nastawy zadanego luksu, odczyt z systemu oswietlenia, schemat DALI, schemat magistrali (KNX/BACnet/Modbus)
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Monitoring i sterowanie (`monitoring_and_control`)

### MC-13 — Centralne raportowanie pracy i zuzycia budynku (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #22  ·  **Expected Gain:** 2.175% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Centralne raportowanie pracy i zuzycia budynku (usluga MC-13). Zbieranie w jednym miejscu danych o pracy i zuzyciu wszystkich instalacji technicznych, aby umozliwic zarzadzanie energia calym budynkiem. Znaczenie energetyczne: Zapewnia caloscowy obraz zuzycia i sprawnosci, umozliwiajac priorytetyzacje dzialan, benchmarking i utrzymanie efektow w czasie.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.417% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | wysoki | 3 | 0.909% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.850% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Integracja z BMS/BACS (od FL1, engineering_assumption)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Pomiar energii/ciepla/chlodu (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- Wykrywanie usterek (FDD) (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ wdrozenie centralnej platformy EMS, agregacja danych ze wszystkich domen, KPI, benchmarking i alarmy
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+0.909%); Informacja dla uzytkownikow (+0.556%); Efektywnosc energetyczna (+0.417%); Wygoda obslugi (+0.294%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Integracja z BMS/BACS, Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Integracja z BMS/BACS (12 uslug), Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Pomiar energii/ciepla/chlodu (8 uslug), Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug)
- Powiazane uslugi: H-3/C-3/DHW-3/DE-4/E-2/E-11/E-12/V-6 (zrodla danych), MC-4 (FDD), MC-30 (platforma sterowania)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc licznikow i archiwizacje danych zuzycia.
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- _Dowody:_ architektura BMS, dostep do platformy, eksport trendow, konfiguracja historiana, konfiguracja powiadomien, lista alarmow, lista integracji, lista integrowanych systemow/punktow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-25 — Integracja ze smart grid (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #10  ·  **Expected Gain:** 2.737% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Integracja ze smart grid (usluga MC-25). Umozliwienie budynkowi komunikacji i wspolpracy z inteligentna siecia energetyczna (odbior sygnalow, uslugi elastycznosci). Znaczenie energetyczne: Warunek uczestnictwa w elastycznosci energetycznej (kryterium o wysokiej wadze w SRI) — pozwala reagowac na siec i czerpac korzysci rynkowe.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.417% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.098% |
| Elastycznosc energetyczna | wysoki | 3 | 2.222% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, official_methodology)
- Pomiar dwukierunkowy (od FL2, official_methodology)
- _Kierunki modernizacji:_ wdrozenie bramy smart grid/OpenADR, koordynacja zasobow elastycznych, przystapienie do programow DSM
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+2.222%); Efektywnosc energetyczna (+0.417%); Wygoda obslugi (+0.098%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Interfejs sygnalow sieci/taryf
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Pomiar dwukierunkowy (6 uslug)
- Powiazane uslugi: H-4/C-4 (elastycznosc HVAC), E-3 (magazyn), EV-16 (EV), MC-28/MC-29 (DSM)

**6. Verification.**

- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz, czy budynek odbiera sygnaly sieci/cen
- ustal reakcje odbiorow/zrodel na sygnaly
- zweryfikuj uslugi sieciowe i rozliczenia (poziom 2)
- _Dowody:_ DTR/tabliczka licznika, konfiguracja OpenADR/DSM, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu, trendy poboru vs sygnaly, trendy reakcji na sygnaly sieci, umowa dystrybucyjna, umowy uslug elastycznosci
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-28 — Raportowanie zarzadzania popytem (DSM) (FLmax 2)

**Priorytet:** High  ·  **Ranking:** #11  ·  **Expected Gain:** 2.340% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie zarzadzania popytem (DSM) (usluga MC-28). Dostarczanie danych o dzialaniach elastycznosci/DSM (kiedy, ile, z jakim efektem), aby oceniac i optymalizowac uslugi sieciowe. Znaczenie energetyczne: Bez raportowania DSM nie da sie ocenic ani rozliczyc elastycznosci — warunek swiadomego udzialu w uslugach sieciowych.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | niski | 1 | 0.303% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.556% |
| Elastycznosc energetyczna | sredni | 2 | 1.482% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Interfejs sygnalow sieci/taryf (od FL1, engineering_assumption)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Pomiar dwukierunkowy (od FL2, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- _Kierunki modernizacji:_ wdrozenie rejestracji i raportow DSM, analiza skutecznosci i oplacalnosci, integracja z EMS/OpenADR
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.482%); Informacja dla uzytkownikow (+0.556%); Utrzymanie i predykcja usterek (+0.303%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Interfejs sygnalow sieci/taryf, Platforma raportowania/wizualizacji
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Platforma raportowania/wizualizacji (13 uslug), Pomiar dwukierunkowy (6 uslug), Rejestracja i historia danych (trendy) (11 uslug)
- Powiazane uslugi: MC-25 (smart grid), MC-29 (override DSM), E-12 (zuzycie), MC-13 (raportowanie)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz obecnosc pomiaru dwukierunkowego i jego dane.
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz rejestracje zdarzen DSM
- ustal, czy raportowany jest efekt (kWh/koszt)
- _Dowody:_ DTR/tabliczka licznika, dashboardy przesuniec poboru, dostep do platformy, eksport trendow, konfiguracja historiana, konfiguracja taryf/OpenADR/SG-Ready, odczyt z systemu, raporty zdarzen DSM
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-29 — Nadrzedne sterowanie DSM (override) (FLmax 4)

**Priorytet:** Critical  ·  **Ranking:** #8  ·  **Expected Gain:** 2.079% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Nadrzedne sterowanie DSM (override) (usluga MC-29). Mozliwosc recznego lub warunkowego nadpisania automatyki DSM, aby chronic komfort/procesy krytyczne podczas zdarzen elastycznosci. Znaczenie energetyczne: Zaufany mechanizm override zwieksza akceptacje DSM (mozna bezpiecznie uczestniczyc), co posrednio zwieksza realna elastycznosc budynku.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | niski | 1 | 0.303% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.294% |
| Elastycznosc energetyczna | sredni | 2 | 1.482% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Nadrzedne sterowanie DSM (override) (od FL1, official_methodology)
- Interfejs sygnalow sieci/taryf (od FL1, engineering_assumption)
- Sterowanie strefowe / indywidualne (od FL2, official_methodology)
- Rejestracja i historia danych (trendy) (od FL3, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie granularnego override z priorytetami, rejestracja i reguly wyjatkow, ochrona procesow krytycznych
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.482%); Utrzymanie i predykcja usterek (+0.303%); Wygoda obslugi (+0.294%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Interfejs sygnalow sieci/taryf, Nadrzedne sterowanie DSM (override)
- Funkcje wspoldzielone miedzydomenowo: Interfejs sygnalow sieci/taryf (19 uslug), Sterowanie strefowe / indywidualne (8 uslug), Rejestracja i historia danych (trendy) (11 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: MC-25 (smart grid), MC-28 (raportowanie DSM), H-4/C-4 (elastycznosc HVAC)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz mozliwosc i granularnosc override oraz rejestracje.
- Sprawdz niezalezne zadawanie parametrow dla stref/pomieszczen.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- sprawdz mozliwosc i zakres override DSM
- _Dowody:_ eksport trendow, konfiguracja BMS/platformy, konfiguracja historiana, konfiguracja override/priorytetow, konfiguracja taryf/OpenADR/SG-Ready, logi override, logi zdarzen override, nastawy per strefa w BMS
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-3 — Zarzadzanie czasem pracy instalacji (harmonogramy) (FLmax 3)

**Priorytet:** Critical  ·  **Ranking:** #1  ·  **Expected Gain:** 4.553% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Zarzadzanie czasem pracy instalacji (harmonogramy) (usluga MC-3). Zalaczanie i wylaczanie instalacji technicznych (HVAC) zgodnie z rzeczywistym uzytkowaniem budynku, zamiast pracy ciaglej. Znaczenie energetyczne: Wylaczanie/ograniczanie instalacji poza godzinami uzytkowania to jedna z najwiekszych i najtanszych oszczednosci; optymalny start unika przegrzewania przed otwarciem.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 1.250% |
| Komfort | sredni | 2 | 1.111% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | niski | 1 | 0.417% |
| Eksploatacja | wysoki | 3 | 0.294% |
| Elastycznosc energetyczna | sredni | 2 | 1.482% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Harmonogramy czasowe (od FL1, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL2, official_methodology)
- Dane pogodowe / prognoza (od FL2, engineering_assumption)
- Detekcja obecnosci (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie realnych harmonogramow i optymalnego start/stop, tryby swiateczne/urlopowe, adaptacja wg obecnosci
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Elastycznosc i magazynowanie energii (+1.482%); Efektywnosc energetyczna (+1.250%); Komfort (+1.111%); Zdrowie i dostepnosc (+0.417%); Wygoda obslugi (+0.294%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe
- Funkcje wspoldzielone miedzydomenowo: Harmonogramy czasowe (9 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug), Detekcja obecnosci (7 uslug)
- Powiazane uslugi: H-1a/C-1a (odbior stref), V-1c (wentylacja), MC-30 (koordynacja/optymalizacja), MC-9 (obecnosc)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- sprawdz istnienie i realnosc harmonogramow dla HVAC
- ustal optymalny start/stop
- _Dowody:_ kalendarze/tryby, konfiguracja BMS/platformy, konfiguracja harmonogramow w BMS, konfiguracja stacji pogodowej/feedu, lista czujnikow PIR/obecnosci, odczyt z BMS, opis logiki optymalizacji, trendy
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-30 — Jedna platforma sterowania i optymalizacji budynku (FLmax 3)

**Priorytet:** Critical  ·  **Ranking:** #19  ·  **Expected Gain:** 1.431% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Jedna platforma sterowania i optymalizacji budynku (usluga MC-30). Zintegrowana platforma (BMS/BACS) koordynujaca wszystkie instalacje i optymalizujaca przeplyw energii wg obecnosci, pogody i sygnalow sieci. Znaczenie energetyczne: Koordynacja miedzydomenowa (np. HVAC + zacienienie + oswietlenie + siec) daje efekty niedostepne dla pojedynczych systemow — najwyzszy poziom inteligencji budynku.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.833% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | niski | 1 | 0.303% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | wysoki | 3 | 0.294% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Integracja z BMS/BACS (od FL1, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL2, official_methodology)
- Platforma raportowania/wizualizacji (od FL2, engineering_assumption)
- Interfejs sygnalow sieci/taryf (od FL3, engineering_assumption)
- Detekcja obecnosci (od FL3, engineering_assumption)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- Dane pogodowe / prognoza (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ integracja systemow na wspolnej platformie, wdrozenie koordynacji miedzydomenowej, optymalizacja predykcyjna wg pogody/obecnosci/sieci
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.833%); Utrzymanie i predykcja usterek (+0.303%); Wygoda obslugi (+0.294%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Integracja z BMS/BACS
- Funkcje wspoldzielone miedzydomenowo: Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Platforma raportowania/wizualizacji (13 uslug), Interfejs sygnalow sieci/taryf (19 uslug), Detekcja obecnosci (7 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug), Dane pogodowe / prognoza (13 uslug)
- Powiazane uslugi: MC-3 (harmonogramy), MC-9 (obecnosc), MC-13 (dane), MC-4 (FDD), MC-25 (siec), wszystkie uslugi domenowe

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz realny odbior sygnalow i reakcje (nie sama deklaracja).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- _Dowody:_ architektura BMS, architektura integracji/BMS, dostep do platformy, konfiguracja BMS/platformy, konfiguracja stacji pogodowej/feedu, konfiguracja taryf/OpenADR/SG-Ready, lista czujnikow PIR/obecnosci, lista integracji
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-4 — Wykrywanie i diagnostyka usterek (FDD) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #20  ·  **Expected Gain:** 3.009% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Wykrywanie i diagnostyka usterek (FDD) (usluga MC-4). Automatyczne wykrywanie usterek i nieprawidlowosci instalacji technicznych oraz wsparcie diagnozy, aby szybko przywracac sprawnosc i unikac strat energii. Znaczenie energetyczne: Niewykryte usterki (zawory, czujniki, jednoczesne grzanie/chlodzenie) powoduja duze, ukryte straty; FDD utrzymuje sprawnosc i obniza koszty eksploatacji.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | wysoki | 3 | 0.909% |
| Bezpieczenstwo | wysoki | 3 | 1.250% |
| Eksploatacja | wysoki | 3 | 0.850% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Alarmy i powiadomienia (od FL1, official_methodology)
- Wykrywanie usterek (FDD) (od FL2, official_methodology)
- Zdalny dostep (od FL3, engineering_assumption)
- Platforma raportowania/wizualizacji (od FL3, engineering_assumption)
- _Kierunki modernizacji:_ wdrozenie regul FDD ponad podstawowe alarmy, priorytetyzacja i proces obslugi zgloszen, integracja z CMMS
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Zdrowie i dostepnosc (+1.250%); Utrzymanie i predykcja usterek (+0.909%); Informacja dla uzytkownikow (+0.556%); Wygoda obslugi (+0.294%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Alarmy i powiadomienia
- Funkcje wspoldzielone miedzydomenowo: Alarmy i powiadomienia (10 uslug), Wykrywanie usterek (FDD) (6 uslug), Zdalny dostep (2 uslug), Platforma raportowania/wizualizacji (13 uslug)
- Powiazane uslugi: MC-13 (dane/raportowanie), H-3/C-3/DHW-3 (dane domenowe), MC-30 (platforma)

**6. Verification.**

- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz mozliwosc bezpiecznego zdalnego dostepu do systemu.
- Sprawdz reguly FDD wykrywajace odchylenia (nie tylko awarie).
- sprawdz obecnosc alarmow i regul FDD
- ustal, czy wykrywane sa odchylenia (nie tylko awarie)
- _Dowody:_ dostep do platformy, integracja z systemem serwisowym, konfiguracja dostepu zdalnego, konfiguracja powiadomien, lista alarmow, lista alarmow/regul FDD, lista regul FDD, raporty wykrytych usterek
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### MC-9 — Detekcja obecnosci dla wielu systemow (FLmax 2)

**Priorytet:** Medium  ·  **Ranking:** #27  ·  **Expected Gain:** 1.676% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Detekcja obecnosci dla wielu systemow (usluga MC-9). Wspoldzielona informacja o obecnosci osob wykorzystywana przez rozne instalacje (HVAC, oswietlenie, wentylacja) do sterowania wg rzeczywistego uzytkowania. Znaczenie energetyczne: Jedna wiarygodna informacja o obecnosci pozwala wszystkim instalacjom ograniczac prace w pustych strefach — mnoznikowy efekt oszczednosci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | niski | 1 | 0.417% |
| Komfort | niski | 1 | 0.556% |
| Utrzymanie | sredni | 2 | 0.606% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.098% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Detekcja obecnosci (od FL1, official_methodology)
- Integracja z BMS/BACS (od FL2, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL2, official_methodology)
- _Kierunki modernizacji:_ konsolidacja detekcji obecnosci jako wspolnej uslugi, integracja z rezerwacja sal/dostepem, powiazanie z HVAC/oswietleniem/wentylacja
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Monitoring i sterowanie
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+0.606%); Komfort (+0.556%); Efektywnosc energetyczna (+0.417%); Wygoda obslugi (+0.098%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Detekcja obecnosci
- Funkcje wspoldzielone miedzydomenowo: Detekcja obecnosci (7 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug)
- Powiazane uslugi: L-1a (oswietlenie), V-1a (wentylacja DCV), H-1a/C-1a (HVAC), MC-30 (platforma)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- sprawdz zrodla danych o obecnosci i ich wspoldzielenie
- ustal, ktore systemy korzystaja z obecnosci
- zweryfikuj integracje wielosystemowa (poziom 2)
- _Dowody:_ architektura BMS, konfiguracja powiazan (HVAC/oswietlenie/wentylacja), lista czujnikow PIR/obecnosci, lista integracji, lista urzadzen na magistrali, odczyt z BMS, schemat integracji obecnosci, schemat magistrali (KNX/BACnet/Modbus)
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

## Wentylacja (`ventilation`)

### V-1a — Sterowanie strumieniem powietrza w pomieszczeniu (FLmax 4)

**Priorytet:** High  ·  **Ranking:** #23  ·  **Expected Gain:** 1.699% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie strumieniem powietrza w pomieszczeniu (usluga V-1a). Dostarczanie swiezego powietrza do pomieszczen w ilosci odpowiadajacej rzeczywistemu zapotrzebowaniu (obecnosc, CO2, wilgotnosc), zamiast stalej wentylacji. Znaczenie energetyczne: Wentylacja na zadanie (DCV) eliminuje wentylowanie pustych pomieszczen, oszczedzajac energie wentylatorow oraz ciepla/chlodu na uzdatnianie powietrza.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.542% |
| Komfort | wysoki | 3 | 0.400% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | wysoki | 3 | 0.444% |
| Eksploatacja | wysoki | 3 | 0.312% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterowanie wg zapotrzebowania (od FL1, engineering_assumption)
- Harmonogramy czasowe (od FL1, official_methodology)
- Detekcja obecnosci (od FL2, official_methodology)
- Pomiar CO2 / jakosci powietrza (od FL3, official_methodology)
- Integracja z BMS/BACS (od FL4, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL4, official_methodology)
- _Kierunki modernizacji:_ wdrozenie DCV wg CO2/obecnosci, montaz regulatorow VAV, kalibracja/wymiana czujnikow CO2
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.542%); Zdrowie i dostepnosc (+0.444%); Komfort (+0.400%); Wygoda obslugi (+0.312%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Harmonogramy czasowe, Sterowanie wg zapotrzebowania
- Funkcje wspoldzielone miedzydomenowo: Sterowanie wg zapotrzebowania (16 uslug), Harmonogramy czasowe (9 uslug), Detekcja obecnosci (7 uslug), Integracja z BMS/BACS (12 uslug), Komunikacja cyfrowa sterownikow (10 uslug)
- Powiazane uslugi: V-1c (poziom centrali), V-2d (temperatura nawiewu), V-6 (raportowanie IAQ), MC-9 (detekcja obecnosci)

**6. Verification.**

- Sprawdz czujniki obecnosci i ich powiazanie z logika sterowania.
- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz istnienie i aktualnosc harmonogramow pracy.
- Sprawdz obecnosc czujnikow CO2 w reprezentatywnych strefach i ich dryft.
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- _Dowody:_ architektura BMS, certyfikat/kalibracja, konfiguracja harmonogramow w BMS, konfiguracja logiki w BMS, lista czujnikow CO2, lista czujnikow PIR/obecnosci, lista integracji, lista urzadzen na magistrali
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### V-1c — Sterowanie wentylatorami centrali (przeplyw/cisnienie) (FLmax 4)

**Priorytet:** Medium  ·  **Ranking:** #50  ·  **Expected Gain:** 0.542% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie wentylatorami centrali (przeplyw/cisnienie) (usluga V-1c). Dopasowanie pracy wentylatorow centrali (AHU) do sumarycznego zapotrzebowania instalacji, ograniczajac energie wentylatorow. Znaczenie energetyczne: Energia wentylatorow rosnie z szescianem predkosci — regulacja wg zapotrzebowania i reset cisnienia daja bardzo duze oszczednosci.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.542% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | brak | 0 | 0.000% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterowanie wg zapotrzebowania (od FL1, official_methodology)
- Naped o zmiennej predkosci (falownik) (od FL2, official_methodology)
- Komunikacja cyfrowa sterownikow (od FL3, official_methodology)
- Integracja z BMS/BACS (od FL4, engineering_assumption)
- _Kierunki modernizacji:_ montaz falownikow, wdrozenie resetu cisnienia wg VAV, wylaczanie central poza godzinami pracy
- _Cel:_ osiagniecie poziomu FL4.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.542%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Sterowanie wg zapotrzebowania
- Funkcje wspoldzielone miedzydomenowo: Sterowanie wg zapotrzebowania (16 uslug), Naped o zmiennej predkosci (falownik) (3 uslug), Komunikacja cyfrowa sterownikow (10 uslug), Integracja z BMS/BACS (12 uslug)
- Powiazane uslugi: V-1a (zapotrzebowanie stref), V-2d (temperatura nawiewu), V-2c (odzysk ciepla)

**6. Verification.**

- Sprawdz integracje cyfrowa sterownikow (protokol, komunikacja).
- Sprawdz obecnosc falownikow i tryb regulacji (nie stala predkosc).
- Sprawdz widocznosc i sterowalnosc uslugi z poziomu BMS.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- sprawdz regulacje predkosci wentylatorow (falowniki)
- ustal tryb (stale/zmienne cisnienie)
- _Dowody:_ DTR centrali i wentylatorow, DTR pomp/wentylatorow, architektura BMS, konfiguracja logiki w BMS, lista integracji, lista urzadzen na magistrali, nastawy regulacji cisnienia, schemat magistrali (KNX/BACnet/Modbus)
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### V-2c — Sterowanie odzyskiem ciepla (ochrona przed przegrzewem) (FLmax 2)

**Priorytet:** Low  ·  **Ranking:** #49  ·  **Expected Gain:** 1.132% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie odzyskiem ciepla (ochrona przed przegrzewem) (usluga V-2c). Sterowanie wymiennikiem odzysku ciepla tak, aby odzyskiwac cieplo/chlod, ale unikac niepozadanego przegrzewania powietrza nawiewanego. Znaczenie energetyczne: Odzysk ciepla to jedna z kluczowych oszczednosci w wentylacji; poprawne sterowanie by-passem umozliwia tez free-cooling i unika przegrzewania.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | sredni | 2 | 0.361% |
| Komfort | sredni | 2 | 0.267% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | sredni | 2 | 0.296% |
| Eksploatacja | sredni | 2 | 0.208% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Sterowanie odzyskiem ciepla (by-pass) (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Free-cooling (od FL2, official_methodology)
- _Kierunki modernizacji:_ dodanie/naprawa by-passu, wdrozenie free-coolingu przez odzysk, logika odszraniania
- _Cel:_ osiagniecie poziomu FL2.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.361%); Zdrowie i dostepnosc (+0.296%); Komfort (+0.267%); Wygoda obslugi (+0.208%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Pomiar temperatury, Sterowanie odzyskiem ciepla (by-pass)
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Free-cooling (3 uslug)
- Powiazane uslugi: V-2d (temperatura nawiewu), V-3 (free-cooling), V-1c (przeplyw centrali)

**6. Verification.**

- Sprawdz logike free-coolingu i jej realne dzialanie.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz obecnosc odzysku, by-passu i logiki ochrony.
- sprawdz obecnosc i typ odzysku oraz by-passu
- ustal logike ochrony przed przegrzewem
- zweryfikuj wykorzystanie free-coolingu (poziom 2)
- _Dowody:_ DTR centrali z odzyskiem, konfiguracja by-passu, konfiguracja economizera, lista czujnikow, odczyt z BMS, trendy, trendy przepustnic/temperatur, trendy temperatur i sprawnosci odzysku
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### V-2d — Sterowanie temperatura nawiewu (centrala) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #26  ·  **Expected Gain:** 0.912% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Sterowanie temperatura nawiewu (centrala) (usluga V-2d). Utrzymanie odpowiedniej temperatury powietrza nawiewanego wg zapotrzebowania, aby zapewnic komfort i unikac zbednego grzania/chlodzenia powietrza. Znaczenie energetyczne: Reset temperatury nawiewu wg realnych potrzeb ogranicza jednoczesne grzanie i chlodzenie powietrza oraz zbedne uzdatnianie.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.542% |
| Komfort | sredni | 2 | 0.267% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | brak | 0 | 0.000% |
| Eksploatacja | niski | 1 | 0.104% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar temperatury (od FL1, engineering_assumption)
- Dane pogodowe / prognoza (od FL1, official_methodology)
- Sterowanie wg zapotrzebowania (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie resetu temperatury nawiewu, wprowadzenie martwej strefy w sekwencji, kompensacja pogodowa
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.542%); Komfort (+0.267%); Wygoda obslugi (+0.104%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Dane pogodowe / prognoza, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Pomiar temperatury (17 uslug), Dane pogodowe / prognoza (13 uslug), Sterowanie wg zapotrzebowania (16 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: V-1a/V-1c (przeplyw), V-2c (odzysk), C-1c/H-1c (parametry mediow)

**6. Verification.**

- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- Sprawdz zrodlo danych pogodowych i jego uzycie w krzywych/predykcji.
- Sprawdz, czy nastawy zmieniaja sie wg zapotrzebowania, nie na stalo.
- przejrzyj trendy temperatur
- sprawdz, czy temperatura nawiewu jest stala czy resetowana
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja logiki w BMS, konfiguracja stacji pogodowej/feedu, lista czujnikow, nastawy sekwencji grzanie/chlodzenie, odczyt z BMS, opis logiki optymalizacji, schemat centrali
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### V-3 — Free-cooling wentylacja mechaniczna (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #24  ·  **Expected Gain:** 1.298% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Free-cooling wentylacja mechaniczna (usluga V-3). Chlodzenie budynku swiezym, chlodnym powietrzem zewnetrznym (zamiast agregatu), gdy warunki na to pozwalaja. Znaczenie energetyczne: Free-cooling zastepuje prace agregatu chlodniczego w okresach przejsciowych i noca — duze oszczednosci energii chlodniczej.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | wysoki | 3 | 0.542% |
| Komfort | wysoki | 3 | 0.400% |
| Utrzymanie | brak | 0 | 0.000% |
| Bezpieczenstwo | niski | 1 | 0.148% |
| Eksploatacja | sredni | 2 | 0.208% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Free-cooling (od FL1, official_methodology)
- Pomiar temperatury (od FL1, engineering_assumption)
- Pomiar wilgotnosci (od FL2, official_methodology)
- Sterowanie predykcyjne / optymalizacja (od FL3, official_methodology)
- _Kierunki modernizacji:_ wdrozenie economizera entalpiowego, aktywacja nocnego przewietrzania, koordynacja z chlodzeniem mechanicznym
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Efektywnosc energetyczna (+0.542%); Komfort (+0.400%); Wygoda obslugi (+0.208%); Zdrowie i dostepnosc (+0.148%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Free-cooling, Pomiar temperatury
- Funkcje wspoldzielone miedzydomenowo: Free-cooling (3 uslug), Pomiar temperatury (17 uslug), Pomiar wilgotnosci (2 uslug), Sterowanie predykcyjne / optymalizacja (27 uslug)
- Powiazane uslugi: V-2c (odzysk/by-pass), V-1c (przeplyw), C-1a (koordynacja z chlodzeniem)

**6. Verification.**

- Sprawdz logike free-coolingu i jej realne dzialanie.
- Sprawdz obecnosc i wiarygodnosc punktow pomiaru temperatury w BMS.
- Sprawdz punkty pomiaru wilgotnosci i ich wykorzystanie w logice.
- Sprawdz realne uzycie predykcji/optymalizacji (nie tylko harmonogram).
- sprawdz mozliwosc zwiekszenia strumienia swiezego powietrza
- ustal logike free-coolingu (temperatura/entalpia)
- _Dowody:_ konfiguracja BMS/platformy, konfiguracja economizera, lista czujnikow, odczyt z BMS, opis logiki optymalizacji, schemat central z przepustnicami, trendy, trendy przepustnic i temperatur
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---

### V-6 — Raportowanie jakosci powietrza (IAQ) (FLmax 3)

**Priorytet:** High  ·  **Ranking:** #9  ·  **Expected Gain:** 4.128% SRI

**1. Gap.** Brak lub niepelne wdrozenie: Raportowanie jakosci powietrza (IAQ) (usluga V-6). Monitorowanie i informowanie o jakosci powietrza wewnetrznego (CO2, wilgotnosc, VOC), aby zapewnic zdrowe warunki i wesprzec sterowanie wentylacja. Znaczenie energetyczne: Dane IAQ umozliwiaja wentylacje na zadanie (nie wiecej niz trzeba) — poprawa zdrowia bez przewentylowywania i marnowania energii.

**2. Business Impact.**

| Wymiar | Poziom | Maks. impact score | Expected Gain |
|---|---|---|---|
| Efektywnosc energetyczna | brak | 0 | 0.000% |
| Komfort | brak | 0 | 0.000% |
| Utrzymanie | sredni | 2 | 2.731% |
| Bezpieczenstwo | wysoki | 3 | 0.444% |
| Eksploatacja | wysoki | 3 | 0.952% |
| Elastycznosc energetyczna | brak | 0 | 0.000% |

**3. Technical Recommendation** (funkcjonalnie, bez producenta):

- Pomiar CO2 / jakosci powietrza (od FL1, official_methodology)
- Platforma raportowania/wizualizacji (od FL1, official_methodology)
- Rejestracja i historia danych (trendy) (od FL2, official_methodology)
- Alarmy i powiadomienia (od FL3, official_methodology)
- _Kierunki modernizacji:_ montaz czujnikow CO2/VOC w strefach, dashboard i alarmy IAQ, powiazanie IAQ ze sterowaniem DCV
- _Cel:_ osiagniecie poziomu FL3.

**4. Expected Improvement.**

- Domena: Wentylacja
- Kryteria, ktore wzrosna: Utrzymanie i predykcja usterek (+2.731%); Informacja dla uzytkownikow (+0.952%); Zdrowie i dostepnosc (+0.444%)

**5. Dependencies.**

- Wdroz najpierw (FL1): Platforma raportowania/wizualizacji, Pomiar CO2 / jakosci powietrza
- Funkcje wspoldzielone miedzydomenowo: Platforma raportowania/wizualizacji (13 uslug), Rejestracja i historia danych (trendy) (11 uslug), Alarmy i powiadomienia (10 uslug)
- Powiazane uslugi: V-1a (DCV wykorzystuje dane IAQ), MC-13 (centralne raportowanie), MC-9 (obecnosc)

**6. Verification.**

- Sprawdz archiwizacje danych i dostepnosc historii/trendow.
- Sprawdz dostepnosc platformy prezentujacej dane uslugi.
- Sprawdz konfiguracje alarmow i sciezke powiadomien.
- Sprawdz obecnosc czujnikow CO2 w reprezentatywnych strefach i ich dryft.
- sprawdz obecnosc czujnikow IAQ i archiwizacje danych
- ustal informowanie uzytkownikow (poziom 3)
- _Dowody:_ certyfikat/kalibracja, dashboardy IAQ, dostep do platformy, eksport trendow, eksport trendow CO2/wilgotnosci, konfiguracja historiana, konfiguracja powiadomien, lista alarmow
- _Oznacz needs_verification, gdy:_ brak dowodu lub dane niespojne/przestarzale -> needs_verification

---
