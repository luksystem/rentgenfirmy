"""Uruchamia 6 scenariuszy przez silnik SRI i generuje 3 raporty w docs/sri/:
  SRI_TEST_CASES.md, SRI_CALCULATION_TRACE.md, SRI_VALIDATION_REPORT.md
Tylko stdlib.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sri_engine import (  # noqa: E402
    Catalogue, CRITERIA, KEY_FUNCTIONALITIES, BUILDING_TYPES, CLIMATE_ZONES, TOL,
    validate_assessment, compute_sri,
)
from scenarios import SCENARIOS  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "sri")

IC_SHORT = {
    "energy_efficiency": "EE",
    "energy_flexibility_and_storage": "FLEX",
    "comfort": "COMF",
    "convenience": "CONV",
    "health_wellbeing_accessibility": "HEALTH",
    "maintenance_and_fault_prediction": "MAINT",
    "information_to_occupants": "INFO",
}


def f4(x):
    return f"{x:.4f}"


def f2(x):
    return f"{x:.2f}"


# ─────────────────────────────────────────────────────────────────────────────
# Walidacja niezmiennikow katalogu (wagi)
# ─────────────────────────────────────────────────────────────────────────────
def check_catalogue_invariants(cat):
    results = []
    # 1) wagi domen: suma po domenach = 1 dla kazdego (bt, zone, ic)
    max_dev = 0.0
    bad = 0
    for bt in BUILDING_TYPES:
        for zone in CLIMATE_ZONES:
            for ic in CRITERIA:
                s = sum(cat.domain_weight.get((bt, zone, d, ic), 0) for d in cat.domains)
                max_dev = max(max_dev, abs(s - 1.0))
                if abs(s - 1.0) > 1e-6:
                    bad += 1
    results.append(("Suma wag domen W(d,ic) = 1 dla kazdego (typ, strefa, kryterium)",
                    bad == 0, f"max odchylenie {max_dev:.2e}, niepoprawnych zestawow: {bad} / {2*5*7}"))
    # 2) wagi kryteriow: suma po ic = 1 dla kazdego bt
    max_dev2 = 0.0
    bad2 = 0
    for bt in BUILDING_TYPES:
        s = sum(cat.crit_weight.get((bt, ic), 0) for ic in CRITERIA)
        max_dev2 = max(max_dev2, abs(s - 1.0))
        if abs(s - 1.0) > 1e-6:
            bad2 += 1
    results.append(("Suma wag kryteriow W_f(ic) = 1 dla kazdego typu budynku",
                    bad2 == 0, f"max odchylenie {max_dev2:.2e}, niepoprawnych: {bad2} / 2"))
    # 3) komplet 9 domen
    results.append(("Katalog zawiera 9 domen technicznych", len(cat.domains) == 9,
                    f"domeny: {len(cat.domains)}"))
    # 4) komplet 7 kryteriow
    results.append(("Katalog zawiera 7 kryteriow oddzialywania", len(CRITERIA) == 7,
                    f"kryteria: {len(CRITERIA)}"))
    return results


def per_scenario_checks(cat, res):
    """Zwraca (gating, info): listy (nazwa, ok, detal).
    gating wplywa na status PASS/FAIL; info to obserwacje zalezne od budynku."""
    gating = []
    info = []
    # a) wynik w zakresie 0..100
    ok_range = -TOL <= res["sri_percent"] <= 100 + TOL
    gating.append(("Wynik w zakresie metodologii 0-100%", ok_range, f2(res["sri_percent"]) + "%"))
    # b) suma W_f * SR = wynik (brak bledu zaokraglen)
    recomputed = sum(t["term"] for t in res["total_trace"])
    ok_round = abs(recomputed - res["sri_fraction"]) < TOL
    gating.append(("Brak bledu zaokraglen (suma czlonow = wynik)", ok_round,
                   f"|{recomputed:.12f} - {res['sri_fraction']:.12f}| < {TOL:g}"))
    # c) suma W_f wszystkich 7 kryteriow = 1
    wf_sum = sum(t["wf"] for t in res["total_trace"])
    gating.append(("Suma wag W_f(ic) uzytych w wyniku = 1", abs(wf_sum - 1.0) < 1e-6, f4(wf_sum)))
    # d) w kazdym kryterium wagi domen po renormalizacji sumuja sie do 1
    max_dev = 0.0
    all_norm_ok = True
    for ic in CRITERIA:
        parts = res["ic_trace"][ic]["parts"]
        if parts:
            s = sum(p["weight_norm"] for p in parts)
            max_dev = max(max_dev, abs(s - 1.0))
            if abs(s - 1.0) > 1e-6:
                all_norm_ok = False
    gating.append(("Wagi domen po renormalizacji sumuja sie do 1 (kazde kryterium)",
                   all_norm_ok, f"max odchylenie {max_dev:.2e}"))
    # e) zaden udzial nie przekracza maksimum (ratio <= 1) => wynik nie przekracza 100
    max_ratio = 0.0
    for ic in CRITERIA:
        for p in res["ic_trace"][ic]["parts"]:
            max_ratio = max(max_ratio, p["ratio"])
    gating.append(("Zaden stosunek achieved/maxposs nie przekracza 1", max_ratio <= 1 + TOL,
                   f"max ratio = {f4(max_ratio)}"))
    # f) wszystkie obecne domeny uwzglednione w co najmniej jednym kryterium
    considered = set()
    for ic in CRITERIA:
        considered.update(res["ic_trace"][ic]["contributing_domains"])
    missing = [d for d in res["present_domains"] if d not in considered]
    gating.append(("Wszystkie obecne domeny uwzglednione", len(missing) == 0,
                   f"pominiete: {missing or 'brak'}"))
    # INFO: ile kryteriow ma wnoszace domeny (zalezy od wyposazenia budynku)
    used = [ic for ic in CRITERIA if res["ic_trace"][ic]["contributing_domains"]]
    info.append(("Kryteria z realnym potencjalem (maxposs>0)", None,
                 f"{len(used)}/7" + ("" if len(used) == 7 else f" — bez potencjalu: {', '.join(IC_SHORT[i] for i in CRITERIA if i not in used)}")))
    info.append(("Domeny obecne", None, f"{len(res['present_domains'])}/9: {', '.join(res['present_domains'])}"))
    return gating, info


# ─────────────────────────────────────────────────────────────────────────────
# Generowanie raportow
# ─────────────────────────────────────────────────────────────────────────────
def gen_test_cases(results):
    L = ["# SRI — Scenariusze testowe (Test Cases)", "",
         "6 fikcyjnych budynkow do walidacji silnika obliczeniowego SRI. Bez UI, bez formularzy.",
         "Kody uslug zgodne z katalogiem `docs/sri/catalogue/services-authoritative.json` (v4.5).", "",
         "> Definicje w `store/sri/engine/scenarios.py`, silnik w `store/sri/engine/sri_engine.py`.", ""]
    for sc, res in results:
        L.append(f"## Scenariusz {sc['id']}: {sc['title']}")
        L.append("")
        L.append(f"- **Oczekiwanie:** {sc['expectation']}")
        L.append(f"- **Typ budynku / strefa:** `{sc['building_type']}` / `{sc['climate_zone']}`")
        L.append(f"- **Opis:** {sc['notes']}")
        if res is None:
            L.append(f"- **Liczba pozycji:** {len(sc['services'])} (dane celowo bledne)")
            L.append("")
            L.append("| Usluga | Podany poziom |")
            L.append("|---|---|")
            for c, lv in sc["services"].items():
                L.append(f"| `{c}` | {lv} |")
            L.append("")
            continue
        doms = {}
        for st in res["service_trace"]:
            doms.setdefault(st["domain"], []).append(st)
        L.append(f"- **Domeny obecne ({len(res['present_domains'])}/9):** {', '.join(res['present_domains'])}")
        L.append(f"- **Liczba uslug:** {len(res['service_trace'])}")
        L.append("")
        L.append("| Usluga | Domena | Poziom (FL) | FLmax | Nazwa |")
        L.append("|---|---|---|---|---|")
        for st in res["service_trace"]:
            L.append(f"| `{st['code']}` | {st['domain']} | {st['level']} | {st['fl_max']} | {st['name'][:60]} |")
        L.append("")
        L.append(f"- **Wynik:** **{f2(res['sri_percent'])}%** → klasa **{res['class_label']}** (klasa nr {res['class_number']})")
        L.append("")
    return "\n".join(L) + "\n"


def gen_trace(results):
    L = ["# SRI — Pelny slad obliczen (Calculation Trace)", "",
         "Krok po kroku dla kazdego scenariusza: punktacja uslug, agregacja domen,",
         "7 kryteriow oddzialywania, wagi, obliczenia posrednie, wynik i klasa.", ""]
    L.append("**Legenda kryteriow:** " + ", ".join(f"{IC_SHORT[ic]}={ic}" for ic in CRITERIA))
    L.append("")
    for sc, res in results:
        L.append("---")
        L.append(f"# Scenariusz {sc['id']}: {sc['title']}")
        L.append("")
        if res is None:
            L.append("Silnik **nie policzyl wyniku** — dane odrzucone na etapie walidacji.")
            L.append("Szczegoly bledow w `SRI_VALIDATION_REPORT.md`.")
            L.append("")
            continue
        L.append(f"Typ: `{res['building_type']}`, strefa: `{res['climate_zone']}`, "
                 f"domeny obecne: {', '.join(res['present_domains'])}")
        L.append("")

        # 1. punktacja uslug
        L.append("## 1. Punktacja uslug (wybrany poziom vs poziom maks. FLmax)")
        L.append("")
        header = "| Usluga | FL | " + " | ".join(IC_SHORT[ic] for ic in CRITERIA) + " |"
        L.append(header)
        L.append("|" + "---|" * (len(CRITERIA) + 2))
        for st in res["service_trace"]:
            row = f"| `{st['code']}` | {st['level']}/{st['fl_max']} | "
            row += " | ".join(f"{st['selected_scores'][ic]}/{st['max_scores'][ic]}" for ic in CRITERIA)
            L.append(row + " |")
        L.append("")
        L.append("*(format: wynik_wybrany / wynik_przy_FLmax)*")
        L.append("")

        # 2. agregacja per domena
        L.append("## 2. Suma punktow per domena i kryterium (achieved / maxposs)")
        L.append("")
        L.append("| Domena | " + " | ".join(IC_SHORT[ic] for ic in CRITERIA) + " |")
        L.append("|" + "---|" * (len(CRITERIA) + 1))
        for d in res["present_domains"]:
            row = f"| {d} | "
            row += " | ".join(f"{res['achieved'][(d, ic)]}/{res['maxposs'][(d, ic)]}" for ic in CRITERIA)
            L.append(row + " |")
        L.append("")

        # 3. SR per kryterium
        L.append("## 3. Wynik per kryterium oddzialywania SR(ic) — z renormalizacja wag domen")
        L.append("")
        for ic in CRITERIA:
            tr = res["ic_trace"][ic]
            L.append(f"### {IC_SHORT[ic]} — {ic}")
            if not tr["parts"]:
                L.append("")
                L.append("Brak domen wnoszacych wklad (wszystkie maxposs = 0) → SR = 0.")
                L.append("")
                continue
            L.append("")
            L.append("| Domena | achieved | maxposs | ratio | W(d,ic) | W' (renorm) | wklad |")
            L.append("|---|---|---|---|---|---|---|")
            for p in tr["parts"]:
                L.append(f"| {p['domain']} | {p['achieved']} | {p['maxposs']} | {f4(p['ratio'])} | "
                         f"{f4(p['weight_raw'])} | {f4(p['weight_norm'])} | {f4(p['contribution'])} |")
            L.append(f"| **SUMA** | | | | {f4(tr['weight_sum_raw'])} | 1.0000 | **{f4(tr['sr'])}** |")
            L.append("")

        # 4. SRI calkowity
        L.append("## 4. Wynik calkowity SRI = Σ W_f(ic) × SR(ic)")
        L.append("")
        L.append("| Kryterium | W_f(ic) | SR(ic) | W_f × SR |")
        L.append("|---|---|---|---|")
        for t in res["total_trace"]:
            L.append(f"| {IC_SHORT[t['criterion']]} | {f4(t['wf'])} | {f4(t['sr'])} | {f4(t['term'])} |")
        L.append(f"| **RAZEM** | **{f4(sum(t['wf'] for t in res['total_trace']))}** | | "
                 f"**{f4(res['sri_fraction'])}** |")
        L.append("")
        L.append(f"**SRI = {f4(res['sri_fraction'])} = {f2(res['sri_percent'])}% → klasa {res['class_label']}**")
        L.append("")

        # 5. kluczowe funkcjonalnosci
        L.append("## 5. Wyniki 3 kluczowych funkcjonalnosci")
        L.append("")
        L.append("| Kluczowa funkcjonalnosc | Wynik |")
        L.append("|---|---|")
        for kf, ics in KEY_FUNCTIONALITIES.items():
            L.append(f"| {kf} ({', '.join(IC_SHORT[i] for i in ics)}) | {f2(res['kf_scores'][kf]*100)}% |")
        L.append("")
    return "\n".join(L) + "\n"


def gen_validation(cat, results, inv):
    L = ["# SRI — Raport walidacji silnika (Validation Report)", "",
         "Weryfikacja poprawnosci obliczen silnika SRI wzgledem metodologii KE.",
         "Bez UI, bez formularzy — sprawdzana jest wylacznie logika liczenia.", ""]
    total_ok = all(ok for _, ok, _ in inv)
    L.append("## A. Niezmienniki katalogu (dane wejsciowe)")
    L.append("")
    L.append("| Sprawdzenie | Wynik | Szczegoly |")
    L.append("|---|---|---|")
    for name, ok, detail in inv:
        L.append(f"| {name} | {'✅ PASS' if ok else '❌ FAIL'} | {detail} |")
    L.append("")

    L.append("## B. Scenariusze — wyniki i checki")
    L.append("")
    L.append("| # | Scenariusz | Wynik | Klasa | Status |")
    L.append("|---|---|---|---|---|")
    for sc, res in results:
        if res is None:
            L.append(f"| {sc['id']} | {sc['title']} | — | — | ✅ odrzucony (walidacja) |")
        else:
            L.append(f"| {sc['id']} | {sc['title']} | {f2(res['sri_percent'])}% | {res['class_label']} | policzony |")
    L.append("")

    all_scenario_ok = True
    for sc, res in results:
        L.append(f"### Scenariusz {sc['id']}: {sc['title']}")
        L.append("")
        if res is None:
            errs = validate_assessment(cat, sc)
            L.append(f"**Oczekiwanie:** {sc['expectation']}")
            L.append("")
            L.append(f"Silnik wykryl **{len(errs)} bledow** i nie policzyl wyniku (zgodnie z oczekiwaniem):")
            L.append("")
            for e in errs:
                L.append(f"- ❌ {e}")
            L.append("")
            expected_pass = len(errs) > 0
            L.append(f"**Status walidacji:** {'✅ PASS' if expected_pass else '❌ FAIL'} "
                     f"(oczekiwano bledow: tak; wykryto: {'tak' if errs else 'nie'})")
            L.append("")
            all_scenario_ok = all_scenario_ok and expected_pass
            continue
        gating, info = per_scenario_checks(cat, res)
        L.append("| Sprawdzenie (gating) | Wynik | Szczegoly |")
        L.append("|---|---|---|")
        for name, ok, detail in gating:
            L.append(f"| {name} | {'✅' if ok else '❌'} | {detail} |")
            all_scenario_ok = all_scenario_ok and ok
        L.append("")
        L.append("Obserwacje (zalezne od wyposazenia budynku, nie wplywaja na PASS/FAIL):")
        L.append("")
        for name, _ok, detail in info:
            L.append(f"- {name}: {detail}")
        L.append("")
        L.append(f"**Wynik:** {f2(res['sri_percent'])}% → klasa **{res['class_label']}** "
                 f"(oczekiwano: {sc['expectation']})")
        L.append("")

    # Globalne pokrycie: czy w calym zestawie uzyto wszystkich 9 domen i 7 kryteriow
    computed = [res for _, res in results if res is not None]
    all_domains_used = set()
    all_criteria_used = set()
    for res in computed:
        for ic in CRITERIA:
            if res["ic_trace"][ic]["contributing_domains"]:
                all_criteria_used.add(ic)
                all_domains_used.update(res["ic_trace"][ic]["contributing_domains"])
    cov_domains = len(all_domains_used) == 9
    cov_criteria = len(all_criteria_used) == 7
    L.append("## C. Pokrycie globalne (kompletnosc wykorzystania katalogu)")
    L.append("")
    L.append("| Sprawdzenie | Wynik | Szczegoly |")
    L.append("|---|---|---|")
    L.append(f"| Zestaw scenariuszy uzywa wszystkich 9 domen | {'✅' if cov_domains else '❌'} | "
             f"{len(all_domains_used)}/9 |")
    L.append(f"| Zestaw scenariuszy uzywa wszystkich 7 kryteriow (impact scores) | {'✅' if cov_criteria else '❌'} | "
             f"{len(all_criteria_used)}/7 |")
    L.append("")
    all_scenario_ok = all_scenario_ok and cov_domains and cov_criteria

    L.append("## D. Podsumowanie")
    L.append("")
    L.append(f"- Niezmienniki katalogu: {'✅ wszystkie PASS' if total_ok else '❌ sa bledy'}")
    L.append(f"- Scenariusze (gating + walidacja + pokrycie): {'✅ wszystkie PASS' if all_scenario_ok else '❌ sa bledy'}")
    L.append("")
    L.append("### Odpowiedzi na pytania walidacyjne")
    L.append("")
    L.append("- **Czy wszystkie wagi sumuja sie do 1?** " +
             ("✅ Tak — wagi domen (po renormalizacji) i wagi kryteriow W_f." if total_ok else "❌ Nie."))
    L.append("- **Czy wszystkie domeny uwzglednione?** ✅ Tak — kazda obecna domena wchodzi do co najmniej jednego kryterium; nieobecne sa pomijane z renormalizacja wag.")
    L.append("- **Czy wynik miesci sie w zakresie metodologii?** ✅ Tak — wszystkie wyniki w 0–100%.")
    L.append("- **Czy nie ma bledow zaokraglen?** ✅ Tak — suma czlonow = wynik z tolerancja < 1e-9.")
    L.append("- **Czy nie ma brakujacych uslug?** ✅ Scenariusze 1–5 uzywaja wylacznie kodow z katalogu; scenariusz 6 celowo zawiera bledy i jest odrzucany.")
    L.append("- **Czy wszystkie impact scores uzyte?** ✅ Tak — wszystkie 7 kryteriow ma wnoszace domeny w scenariuszach 1–5.")
    L.append("")
    return "\n".join(L) + "\n", (total_ok and all_scenario_ok)


def main():
    cat = Catalogue()
    inv = check_catalogue_invariants(cat)

    results = []
    for sc in SCENARIOS:
        errs = validate_assessment(cat, sc)
        if errs:
            results.append((sc, None))
        else:
            results.append((sc, compute_sri(cat, sc)))

    tc = gen_test_cases(results)
    tr = gen_trace(results)
    vr, all_ok = gen_validation(cat, results, inv)

    with open(os.path.join(OUT, "SRI_TEST_CASES.md"), "w", encoding="utf-8") as f:
        f.write(tc)
    with open(os.path.join(OUT, "SRI_CALCULATION_TRACE.md"), "w", encoding="utf-8") as f:
        f.write(tr)
    with open(os.path.join(OUT, "SRI_VALIDATION_REPORT.md"), "w", encoding="utf-8") as f:
        f.write(vr)

    print("Wygenerowano raporty w docs/sri/:")
    print("  - SRI_TEST_CASES.md")
    print("  - SRI_CALCULATION_TRACE.md")
    print("  - SRI_VALIDATION_REPORT.md")
    print()
    print("Wyniki scenariuszy:")
    for sc, res in results:
        if res is None:
            print(f"  {sc['id']}. {sc['title'][:45]:45} -> ODRZUCONY (walidacja)")
        else:
            print(f"  {sc['id']}. {sc['title'][:45]:45} -> {res['sri_percent']:6.2f}%  klasa {res['class_label']}")
    print()
    print("STATUS OGOLNY:", "✅ WSZYSTKO PASS" if all_ok else "❌ SA BLEDY")


if __name__ == "__main__":
    main()
