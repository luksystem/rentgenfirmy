# SRI — Ekspercka baza wiedzy (karty uslug)

Kompletna baza wiedzy eksperckiej dla wszystkich **54 uslug SRI Method B** (v4.5).
Jedna karta na usluge, 16 pol. Warstwa danych wykorzystywana pozniej przez caly system
(audyt, oferty, rekomendacje). **Bez UI, bez formularzy, bez pytan audytowych, bez ROI.**

**Status:** ✅ 54/54 kart kompletnych (wszystkie pola i wszystkie poziomy funkcjonalnosci wypelnione).

---

## 1. Lokalizacja

| Element | Sciezka |
|---|---|
| Karty (JSON, per domena) | `docs/sri/knowledge/<domena>.json` (9 plikow) |
| Indeks | `docs/sri/knowledge/index.json` |
| Tresc ekspercka (zrodlo) | `store/sri/knowledge/expert/*.py` (9 modulow) |
| Builder | `store/sri/knowledge/build_knowledge.py` |

Regeneracja: `python knowledge/build_knowledge.py` (z katalogu `store/sri`). Builder waliduje kompletnosc (54 karty, 16 pol, praktyczny opis kazdego poziomu) i konczy statusem PASS/FAIL.

---

## 2. Podzial (9 domen, 54 uslugi)

| Domena | Liczba kart |
|---|---|
| Ogrzewanie (heating) | 10 |
| Chlodzenie (cooling) | 10 |
| Monitorowanie i sterowanie (monitoring_and_control) | 8 |
| Elektrycznosc (electricity) | 7 |
| Wentylacja (ventilation) | 6 |
| Ciepla woda uzytkowa (domestic_hot_water) | 5 |
| Dynamiczna powloka budynku (dynamic_building_envelope) | 3 |
| Ladowanie EV (electric_vehicle_charging) | 3 |
| Oswietlenie (lighting) | 2 |
| **Razem** | **54** |

---

## 3. Schemat karty (16 pol)

| # | Pole (JSON) | Zawartosc | Zrodlo |
|---|---|---|---|
| 1 | `official_name_en` / `official_name_pl` | Oficjalna nazwa uslugi | Katalog (VERIFIED_ANNEX_D) |
| 2 | `friendly_name_pl` | Nazwa przyjazna uzytkownikowi | Ekspert |
| 3 | `purpose_pl` | Cel uslugi | Ekspert |
| 4 | `technical_description_pl` | Opis techniczny | Ekspert |
| 5 | `energy_significance_pl` | Znaczenie dla efektywnosci energetycznej | Ekspert |
| 6 | `functionality_levels[]` | Poziomy funkcjonalnosci: `official_description_en` + `practical_description_pl` | Katalog + Ekspert |
| 7 | `technologies[]` | Typowe technologie realizujace usluge | Ekspert |
| 8 | `devices[]` | Typowe urzadzenia | Ekspert |
| 9 | `audit_verification[]` | Jak zweryfikowac obecnosc podczas audytu | Ekspert |
| 10 | `evidence[]` | Dowody potwierdzajace wdrozenie | Ekspert |
| 11 | `common_mistakes[]` | Typowe bledy wdrozeniowe | Ekspert |
| 12 | `limitations[]` | Najczestsze ograniczenia | Ekspert |
| 13 | `dependencies[]` | Zaleznosci z innymi uslugami (kody) | Ekspert |
| 14 | `cross_domain_impact[]` | Wplyw na pozostale domeny | Ekspert |
| 15 | `modernization[]` | Mozliwe rekomendacje modernizacyjne | Ekspert |
| 16 | `examples[]` | Przykladowe wdrozenia | Ekspert |

Dodatkowo w karcie: `official_code`, `internal_code`, `domain_code`, `service_group_en`, `included_in_method_a`, `fl_max`.

---

## 4. Proweniencja

Kazda karta ma `provenance`:

```json
"provenance": {
  "official_fields": "VERIFIED_ANNEX_D",
  "expert_fields": "EXPERT_AUTHORED",
  "source_version": "SRI calculation sheet v4.5"
}
```

- **VERIFIED_ANNEX_D** — nazwa oficjalna i oficjalne opisy poziomow funkcjonalnosci pochodza z zweryfikowanego katalogu KE (nie zmieniac recznie; zmieniaja sie tylko przy imporcie nowej wersji SRI).
- **EXPERT_AUTHORED** — pozostale 14 pol to wiedza ekspercka Rentgen (mozna rozwijac i poprawiac; nie sa to dane urzedowe KE).

> Zasada: pola urzedowe i eksperckie sa rozdzielone, by nie mieszac faktow z metodologii KE z komentarzem eksperckim. Aktualizacja metodologii (np. SRI v5.0) odswieza tylko pola urzedowe; tresc ekspercka pozostaje i jest ponownie scalana przez builder.

---

## 5. Zakres (co swiadomie pominieto na tym etapie)

- Pytania audytowe (osobny, pozniejszy etap — karty daja im podstawe przez pole `audit_verification`).
- Logika ofert i ROI.
- UI i formularze.

Baza jest gotowa jako warstwa wiedzy do wykorzystania przez kolejne moduly systemu.
