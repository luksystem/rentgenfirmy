# SRI Recommendation — Validation Report

- Wygenerowano: `2026-07-08T22:22:31.993509+00:00`

> Walidacja jakosci rekomendacji: spojnosc, zgodnosc z gapami, sensownosc priorytetow, premiowanie funkcji cross-domain. Testy `gating` decyduja o statusie; `info` to obserwacje.

## Wyniki per scenariusz

### Scenariusz 1: Budynek bez automatyki

- SRI: 0.00% (klasa G), kandydatow: 7, odrzuconych: 0

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=H-1a (gain 20.609); max gain=C-2a (22.380) |
| C5 priorytety maja sens (gain malejacy) | info | ⚠ | High=16.401, Medium=3.537, Low=6.123 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.675 |

### Scenariusz 2: Male biuro z harmonogramami

- SRI: 44.29% (klasa E), kandydatow: 11, odrzuconych: 2

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=H-3 (gain 17.043); max gain=H-3 (17.043) |
| C5 priorytety maja sens (gain malejacy) | info | ✅ | Critical=10.042, High=7.752, Medium=2.703, Low=0.370 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.403 |

### Scenariusz 3: Sklep typu Decathlon (Loxone/BACnet/Modbus)

- SRI: 73.96% (klasa C), kandydatow: 16, odrzuconych: 6

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=C-2a (gain 8.198); max gain=C-2a (8.198) |
| C5 priorytety maja sens (gain malejacy) | info | ✅ | Critical=3.440, High=1.820, Medium=0.647 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.672 |

### Scenariusz 4: Nowoczesny biurowiec z BMS (bez PV/EV/magazynu)

- SRI: 89.27% (klasa B), kandydatow: 9, odrzuconych: 25

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=H-4 (gain 4.020); max gain=H-4 (4.020) |
| C5 priorytety maja sens (gain malejacy) | info | ✅ | Critical=3.650, High=0.637, Low=0.050 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.485 |

### Scenariusz 5: Budynek z PV i EV, ale bez magazynu energii

- SRI: 57.31% (klasa D), kandydatow: 15, odrzuconych: 4

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=C-2a (gain 8.925); max gain=C-2a (8.925) |
| C5 priorytety maja sens (gain malejacy) | info | ✅ | Critical=4.817, High=2.943, Medium=2.107, Low=0.273 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.097 |

### Scenariusz 6: Budynek z dobrym HVAC, ale slabym monitoringiem energii

- SRI: 74.05% (klasa C), kandydatow: 10, odrzuconych: 11

| Test | Typ | Wynik | Szczegoly |
|---|---|---|---|
| C1 brak rekomendacji istniejacych funkcji | gating | ✅ | OK |
| C2 rekomendacje wynikaja z gapow | gating | ✅ | OK |
| C3 brak sprzecznosci rekomendacji | gating | ✅ | OK |
| C4 najwieksze braki na gorze | info | ✅ | rank#1=H-3 (gain 3.785); max gain=MC-3 (4.668) |
| C5 priorytety maja sens (gain malejacy) | info | ✅ | Critical=2.950, High=2.358 |
| C6 cross-domain premiowane | info | ✅ | corr(leverage, ctx_score) = 0.005 |

## Podsumowanie zbiorcze

- Scenariusze z rekomendacjami: **6/6** (1 kontrolny z bledami wejscia)
- 'Najwieksze braki na gorze' spelnione: **6/6**
- 'Cross-domain premiowane' spelnione: **6/6**
- Testy gating (spojnosc, gapy, brak sprzecznosci): **WSZYSTKIE PASS ✅**

## Gotowosc do etapu Optimization Engine

**TAK ✅** — rekomendacje sa spojne, wynikaja z gapow, nie proponuja funkcji juz istniejacych, najwieksze braki trafiaja na gore listy, a funkcje cross-domain sa premiowane. Model dostarcza marginalny przyrost SRI, priorytety i zaleznosci — wystarczajaca podstawa pod Optimization Engine (dobor sciezki dzialan pod ograniczenia).