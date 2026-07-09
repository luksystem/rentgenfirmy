# SRI Modernization Roadmap Engine

> Algorytm budowy mapy drogowej modernizacji z rekomendacji. Advisory, nie zmienia punktacji SRI.

- Wygenerowano: `2026-07-09T15:51:19.328698+00:00`
- Wersja: `1.0.0`

## Wejscie

- Ocena budynku: uslugi obecne + Functionality Level, uslugi mozliwe do rozbudowy.
- Katalog SRI + silnik (realny SRI), Dependency Engine (capability, blokery), Recommendation Engine (gapy, priorytet).

## Algorytm

1. Policz bazowy SRI oceny.
2. Dla kazdego etapu k=1..5 wyznacz osiagalny FL kazdej uslugi: najwyzszy poziom, dla ktorego wszystkie wymagane capability sa w etapach ≤ k (`reachable_level`).
3. Policz SRI po kazdym etapie (kumulatywnie) i przyrost względem poprzedniego etapu.
4. Akcje etapu = uslugi, ktorych osiagalny FL wzrosl w tym etapie; zapisz dodane capability, ryzyko, liczbe odblokowanych uslug.
5. Zgrupuj akcje w pakiety: po domenie oraz wskaz funkcje cross-domain wdrazane raz.
6. Wyznacz blokery sprzetowe etapu (capability wymagajace montazu).

## Uzasadnienie kolejnosci

- Etap 1 przed 2: efekty bez inwestycji, natychmiastowe.
- Etap 2 przed 3: dane (czujniki/liczniki/BMS) sa warunkiem sterowania zaawansowanego.
- Etap 3 przed 5: predykcja/optymalizacja wymaga dzialajacej automatyki i danych historycznych.
- Etap 4 rownolegle mozliwy, ale kapitalochlonny i o wyzszym ryzyku — po ustabilizowaniu automatyki.

## Wynik per scenariusz (patrz SRI_OPTIMIZATION_TEST_CASES.md)

SRI po kazdym etapie, akcje, blokery, pakiety i uzasadnienie kolejnosci.
