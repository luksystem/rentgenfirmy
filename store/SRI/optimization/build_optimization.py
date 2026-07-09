# -*- coding: utf-8 -*-
"""SRI Optimization Engine — builder + roadmap engine.

Uklada najlepsza kolejnosc modernizacji budynku na podstawie rekomendacji.
Kumulatywny model: usluga awansuje do poziomu FL, dla ktorego wszystkie wymagane
capability naleza do etapow <= k. Po kazdym etapie liczony jest realny SRI.

NIE zmienia punktacji SRI. Bez UI/ofert/kosztow/ROI.

Wynik (docs/sri/optimization/):
  SRI_RECOMMENDATION_GROUPING_RULES.json
  SRI_OPTIMIZATION_MODEL.md
  SRI_MODERNIZATION_ROADMAP_ENGINE.md
  SRI_OPTIMIZATION_TEST_CASES.md

Uruchomienie: python store/sri/optimization/build_optimization.py
"""

import copy
import importlib.util
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REC_DIR = os.path.join(ROOT, "store", "sri", "recommendation")
OUTDIR = os.path.join(ROOT, "docs", "sri", "optimization")
ENGINE_VERSION = "1.0.0"

DOMAIN_PL = {
    "heating": "Ogrzewanie", "domestic_hot_water": "Ciepla woda uzytkowa",
    "cooling": "Chlodzenie", "ventilation": "Wentylacja", "lighting": "Oswietlenie",
    "dynamic_building_envelope": "Dynamiczna obudowa budynku", "electricity": "Elektrycznosc",
    "electric_vehicle_charging": "Ladowanie pojazdow elektrycznych",
    "monitoring_and_control": "Monitoring i sterowanie",
}


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Optimizer:
    def __init__(self):
        self.opt = load_module(os.path.join(HERE, "optimization_data.py"), "optimization_data")
        self.recval = load_module(os.path.join(REC_DIR, "rec_validation.py"), "rec_validation")
        self.engine = self.recval.RecoEngine()
        self.cat = self.engine.cat
        self.dep = self.engine.dep
        self.capcat = self.engine.capcat
        self.stage_of = self.opt.STAGE_BY_CAPABILITY
        # walidacja pokrycia capability
        missing = [c for c in self.capcat if c not in self.stage_of]
        if missing:
            raise RuntimeError(f"Capability bez przypisanego etapu: {missing}")

    def cap_stage(self, cid):
        return self.stage_of[cid]

    def cap_risk(self, cid):
        return self.opt.capability_risk(cid, self.capcat[cid]["needs_manual_verification"], self.cap_stage(cid))

    def reachable_level(self, code, current_level, stage_k):
        """Najwyzszy FL osiagalny po etapie k (capability z etapow <= k)."""
        flmax = self.cat.service_flmax[code]
        reqs = self.dep["services"][code]["required_capabilities"]
        best = current_level
        for L in range(current_level + 1, flmax + 1):
            caps_up = [r for r in reqs if r["min_level"] <= L]
            max_stage = max((self.cap_stage(r["capability"]) for r in caps_up), default=1)
            if max_stage <= stage_k:
                best = L
            else:
                break  # kumulatywny max etapu jest niemalejacy w L
        return best

    def unlocks(self, cid, universe, start_level):
        """Ile innych uslug korzysta z tej capability powyzej swojego biezacego poziomu."""
        out = set()
        for r in self.dep["capability_impact"].get(cid, {}).get("services", []):
            if r not in universe:
                continue
            for req in self.dep["services"][r]["required_capabilities"]:
                if req["capability"] == cid and start_level.get(r, 0) < req["min_level"]:
                    out.add(r)
        return out

    def roadmap(self, scenario):
        cat, eng = self.cat, self.engine
        bt, zone = scenario["building_type"], scenario["climate_zone"]
        services = dict(scenario["services"])
        base_assess = {"building_type": bt, "climate_zone": zone, "services": services}

        errors = eng.eng.validate_assessment(cat, base_assess)
        if errors:
            return {"scenario": scenario, "errors": errors}

        base = eng.sri(base_assess)
        expansions = [c for c in scenario.get("missing_applicable", []) if c not in services]
        universe = list(services) + expansions
        start_level = {c: services.get(c, 0) for c in universe}

        def sri_of(svc):
            return eng.sri({"building_type": bt, "climate_zone": zone, "services": svc})["sri_percent"]

        # Stan po kazdym etapie. Uslugi obecne: awans do reachable_level (monotoniczny,
        # nigdy nie obniza SRI). Uslugi expansion (nowa domena): dolaczane dopiero w etapie,
        # w ktorym daja NIEUJEMNY przyrost (greedy) — chroni przed chwilowym rozcienczeniem SRI.
        stage_state = {0: {c: start_level[c] for c in services}}
        included = {}  # expansion code -> aktualny poziom
        for k in range(1, 6):
            svc = {c: self.reachable_level(c, start_level[c], k) for c in services}
            for e in list(included):
                included[e] = self.reachable_level(e, 0, k)
                svc[e] = included[e]
            pending = [e for e in expansions if e not in included and self.reachable_level(e, 0, k) >= 1]
            improved = True
            while improved and pending:
                improved = False
                cur_sri = sri_of(svc)
                best, best_delta = None, 1e-9
                for e in pending:
                    trial = dict(svc)
                    trial[e] = self.reachable_level(e, 0, k)
                    delta = sri_of(trial) - cur_sri
                    if delta > best_delta:
                        best, best_delta = e, delta
                if best is not None:
                    svc[best] = self.reachable_level(best, 0, k)
                    included[best] = svc[best]
                    pending.remove(best)
                    improved = True
            stage_state[k] = dict(svc)

        sri_stage = {k: sri_of(stage_state[k]) for k in range(0, 6)}

        # akcje per etap (roznica stanow)
        stages_out = []
        for k in range(1, 6):
            prev, cur = stage_state[k - 1], stage_state[k]
            actions = []
            for c in universe:
                pl, cl = prev.get(c, 0), cur.get(c, 0)
                if cl > pl and c in cur:
                    frm, to = pl, cl
                    reqs = self.dep["services"][c]["required_capabilities"]
                    added = [r for r in reqs if frm < r["min_level"] <= to and self.cap_stage(r["capability"]) == k]
                    added_ids = [r["capability"] for r in added]
                    unlocked = set()
                    for cid in added_ids:
                        unlocked |= self.unlocks(cid, universe, start_level)
                    unlocked.discard(c)
                    risk = "low"
                    for cid in added_ids:
                        if self.opt.RISK_ORDER[self.cap_risk(cid)] > self.opt.RISK_ORDER[risk]:
                            risk = self.cap_risk(cid)
                    actions.append({
                        "code": c, "name": eng.name(c),
                        "domain": cat.service_domain[c], "domain_pl": DOMAIN_PL[cat.service_domain[c]],
                        "type": "expansion" if c in expansions else "upgrade",
                        "from_level": frm, "to_level": to,
                        "capabilities_added": [self.capcat[cid]["name_pl"] for cid in added_ids],
                        "capability_ids": added_ids,
                        "risk": risk, "unlocks_count": len(unlocked), "unlocks": sorted(unlocked),
                    })

            # pakiety: grupowanie po domenie + funkcje cross-domain wdrazane raz
            pkg_by_domain = defaultdict(list)
            for a in actions:
                pkg_by_domain[a["domain_pl"]].append(a["code"])
            cross_once = {}
            for a in actions:
                for cid in a["capability_ids"]:
                    if self.dep["capability_impact"].get(cid, {}).get("cross_domain"):
                        cross_once.setdefault(self.capcat[cid]["name_pl"], set()).add(a["code"])
            hardware_blockers = sorted({self.capcat[cid]["name_pl"]
                                        for a in actions for cid in a["capability_ids"]
                                        if self.capcat[cid]["needs_manual_verification"]})

            stages_out.append({
                "stage": k,
                "name": self.opt.STAGES[k - 1]["name"],
                "sri_before": round(sri_stage[k - 1], 2),
                "sri_after": round(sri_stage[k], 2),
                "gain": round(sri_stage[k] - sri_stage[k - 1], 2),
                "actions": sorted(actions, key=lambda a: (-a["unlocks_count"], a["code"])),
                "packages_by_domain": {d: sorted(v) for d, v in sorted(pkg_by_domain.items())},
                "cross_domain_once": {k2: sorted(v) for k2, v in sorted(cross_once.items())},
                "hardware_blockers": hardware_blockers,
            })

        return {
            "scenario": scenario, "errors": [],
            "base_pct": round(base["sri_percent"], 2), "class": base["class_label"],
            "final_pct": round(sri_stage[5], 2),
            "sri_by_stage": {k: round(v, 2) for k, v in sri_stage.items()},
            "stages": stages_out,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Zapis
# ─────────────────────────────────────────────────────────────────────────────
def write_grouping_rules(optimizer, generated_at):
    opt = optimizer.opt
    cap_stage = {c: optimizer.cap_stage(c) for c in sorted(optimizer.capcat)}
    cap_risk = {c: optimizer.cap_risk(c) for c in sorted(optimizer.capcat)}
    stage_caps = defaultdict(list)
    for c, s in cap_stage.items():
        stage_caps[s].append(c)
    data = {
        "meta": {
            "engine": "SRI Optimization Engine — Grouping Rules",
            "engine_version": ENGINE_VERSION, "generated_at": generated_at,
            "role": "advisory_layer",
            "note": "Reguly etapowania i pakowania rekomendacji. Nie zmieniaja punktacji SRI.",
        },
        "stages": opt.STAGES,
        "stage_capabilities": {str(s): sorted(stage_caps[s]) for s in range(1, 6)},
        "capability_stage": cap_stage,
        "capability_risk": cap_risk,
        "packaging_rules": opt.PACKAGING_RULES,
        "staging_logic": {
            "level_progression": ("Usluga awansuje do najwyzszego FL, dla ktorego wszystkie wymagane "
                                  "capability naleza do etapow <= k (kumulatywnie)."),
            "blocking": "Capability z wyzszego etapu blokuje osiagniecie FL, ktory jej wymaga, do tego etapu.",
            "risk": "Ryzyko rekomendacji = maks. ryzyko wsrod dodawanych capability (low<medium<high).",
        },
    }
    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_GROUPING_RULES.json"), "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def write_model_md(optimizer, generated_at):
    opt = optimizer.opt
    L = ["# SRI Optimization Model\n"]
    L.append("> Warstwa **pomocnicza (advisory)** nad Recommendation Engine. Uklada najlepsza kolejnosc "
             "modernizacji. Nie zmienia punktacji SRI. Bez UI, ofert, kosztow i ROI.\n")
    L.append(f"- Wygenerowano: `{generated_at}`")
    L.append(f"- Wersja: `{ENGINE_VERSION}`\n")
    L.append("## Pytania, na ktore odpowiada\n")
    for q in ["ktore dzialania wykonac jako pierwsze", "ktore daja najwiekszy wzrost SRI",
              "ktore odblokowuja kolejne funkcje", "ktore poprawiaja wiele domen naraz",
              "ktore sa warunkiem dla innych rekomendacji", "ktore mozna zgrupowac w jeden etap"]:
        L.append(f"- {q},")
    L.append("")
    L.append("## Czynniki uwzgledniane (9)\n")
    for i, f in enumerate([
        "Expected SRI Gain (marginalny przyrost SRI z silnika)",
        "Liczba domen, na ktore wplywa rekomendacja",
        "Liczba impact criteria poprawianych przez rekomendacje",
        "Zaleznosci i blokery (z Dependency Engine)",
        "Kolejnosc techniczna wdrozenia (etap wymaganych capability)",
        "Latwosc wdrozenia (udzial funkcji programowych vs sprzetowych)",
        "Ryzyko wdrozenia (low/medium/high wg charakteru capability)",
        "Czy rekomendacja odblokowuje inne rekomendacje (liczba uslug korzystajacych z tej funkcji)",
        "Czy rekomendacje mozna polaczyc w jeden pakiet (reguly grupowania)",
    ], 1):
        L.append(f"{i}. {f}")
    L.append("")
    L.append("## Logika etapowania (5 etapow)\n")
    for s in opt.STAGES:
        L.append(f"### Etap {s['id']}: {s['name']}\n")
        L.append(f"- {s['description']}")
        L.append(f"- Prog wejscia: {s['entry_criteria']}")
        L.append(f"- Typowe ryzyko: {s['typical_risk']}\n")
    L.append("## Model postepu (kumulatywny)\n")
    L.append("Kazda capability ma przypisany etap. Usluga awansuje do najwyzszego FL, dla ktorego **wszystkie** "
             "wymagane capability naleza do etapow ≤ k. Po kazdym etapie liczony jest realny SRI silnikiem "
             "(z renormalizacja wag domen), wiec przyrost po etapie jest zgodny z metodologia.\n")
    L.append("## Ryzyko i odblokowania\n")
    L.append("- **Ryzyko** capability: `high` gdy wymaga obecnosci fizycznej urzadzenia (montaz/inwestycja), "
             "`medium` dla zaawansowanej automatyki/AI, `low` dla konfiguracji/integracji programowej. "
             "Ryzyko rekomendacji = maksimum po dodawanych capability.")
    L.append("- **Odblokowania**: capability wspoldzielona przez wiele uslug (np. `bms_integration`, "
             "`energy_metering`, `occupancy_detection`) wdrozona raz podnosi pulap wielu uslug — premiowana "
             "w etapie fundamentu.\n")
    with open(os.path.join(OUTDIR, "SRI_OPTIMIZATION_MODEL.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_roadmap_engine_md(optimizer, generated_at):
    L = ["# SRI Modernization Roadmap Engine\n"]
    L.append("> Algorytm budowy mapy drogowej modernizacji z rekomendacji. Advisory, nie zmienia punktacji SRI.\n")
    L.append(f"- Wygenerowano: `{generated_at}`")
    L.append(f"- Wersja: `{ENGINE_VERSION}`\n")
    L.append("## Wejscie\n")
    L.append("- Ocena budynku: uslugi obecne + Functionality Level, uslugi mozliwe do rozbudowy.")
    L.append("- Katalog SRI + silnik (realny SRI), Dependency Engine (capability, blokery), "
             "Recommendation Engine (gapy, priorytet).\n")
    L.append("## Algorytm\n")
    L.append("1. Policz bazowy SRI oceny.")
    L.append("2. Dla kazdego etapu k=1..5 wyznacz osiagalny FL kazdej uslugi: najwyzszy poziom, dla ktorego "
             "wszystkie wymagane capability sa w etapach ≤ k (`reachable_level`).")
    L.append("3. Policz SRI po kazdym etapie (kumulatywnie) i przyrost względem poprzedniego etapu.")
    L.append("4. Akcje etapu = uslugi, ktorych osiagalny FL wzrosl w tym etapie; zapisz dodane capability, "
             "ryzyko, liczbe odblokowanych uslug.")
    L.append("5. Zgrupuj akcje w pakiety: po domenie oraz wskaz funkcje cross-domain wdrazane raz.")
    L.append("6. Wyznacz blokery sprzetowe etapu (capability wymagajace montazu).\n")
    L.append("## Uzasadnienie kolejnosci\n")
    L.append("- Etap 1 przed 2: efekty bez inwestycji, natychmiastowe.")
    L.append("- Etap 2 przed 3: dane (czujniki/liczniki/BMS) sa warunkiem sterowania zaawansowanego.")
    L.append("- Etap 3 przed 5: predykcja/optymalizacja wymaga dzialajacej automatyki i danych historycznych.")
    L.append("- Etap 4 rownolegle mozliwy, ale kapitalochlonny i o wyzszym ryzyku — po ustabilizowaniu automatyki.\n")
    L.append("## Wynik per scenariusz (patrz SRI_OPTIMIZATION_TEST_CASES.md)\n")
    L.append("SRI po kazdym etapie, akcje, blokery, pakiety i uzasadnienie kolejnosci.\n")
    with open(os.path.join(OUTDIR, "SRI_MODERNIZATION_ROADMAP_ENGINE.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_test_cases_md(optimizer, results, generated_at):
    L = ["# SRI Optimization — Test Cases\n"]
    L.append(f"- Wygenerowano: `{generated_at}`\n")
    L.append("Test roadmap engine na 3 scenariuszach. Dla kazdego: obecny SRI, etapy, przyrost po etapie, "
             "blokery i uzasadnienie kolejnosci.\n")
    for res in results:
        s = res["scenario"]
        L.append(f"## Scenariusz {s['id']}: {s['title']}\n")
        if res["errors"]:
            L.append("Walidacja wejscia zwrocila bledy — pominieto.\n")
            continue
        L.append(f"- Typ: `{s['building_type']}`, strefa: `{s['climate_zone']}`")
        L.append(f"- **Obecny SRI: {res['base_pct']}% (klasa {res['class']})** → "
                 f"**po pelnej roadmapie: {res['final_pct']}%**\n")
        # tabela SRI po etapach
        sbs = res["sri_by_stage"]
        L.append("**Wzrost SRI po etapach:**\n")
        L.append("| Etap | Nazwa | SRI po | Przyrost |")
        L.append("|---|---|---|---|")
        L.append(f"| 0 | stan obecny | {sbs[0]}% | — |")
        for st in res["stages"]:
            L.append(f"| {st['stage']} | {st['name']} | {st['sri_after']}% | +{st['gain']} pkt |")
        L.append("")
        # szczegoly etapow
        for st in res["stages"]:
            if not st["actions"]:
                L.append(f"### Etap {st['stage']}: {st['name']} — brak akcji w tym budynku (+0)\n")
                continue
            L.append(f"### Etap {st['stage']}: {st['name']}\n")
            L.append(f"SRI {st['sri_before']}% → {st['sri_after']}% (**+{st['gain']} pkt**). "
                     f"Blokery sprzetowe: {', '.join(st['hardware_blockers']) or 'brak'}.\n")
            L.append("| Usluga | Typ | FL | Ryzyko | Odblokowuje | Dodane funkcje |")
            L.append("|---|---|---|---|---|---|")
            for a in st["actions"]:
                L.append(f"| {a['code']} {a['name']} | {a['type']} | {a['from_level']}→{a['to_level']} "
                         f"| {a['risk']} | {a['unlocks_count']} uslug | {', '.join(a['capabilities_added']) or '—'} |")
            if st["cross_domain_once"]:
                co = "; ".join(f"{name} → {', '.join(v)}" for name, v in st["cross_domain_once"].items())
                L.append(f"\n_Funkcje cross-domain (wdroz raz):_ {co}")
            pk = "; ".join(f"{d}: {', '.join(v)}" for d, v in st["packages_by_domain"].items())
            L.append(f"\n_Pakiety po domenie:_ {pk}\n")
        # uzasadnienie
        L.append("**Uzasadnienie kolejnosci:** etapy 1-2 dostarczaja efektow bez/niskim kosztem i budują "
                 "warstwe danych, ktora odblokowuje etap 3; elastycznosc (etap 4) i predykcja (etap 5) wchodza "
                 "dopiero po ustabilizowaniu automatyki i danych.\n")
        L.append("---\n")
    with open(os.path.join(OUTDIR, "SRI_OPTIMIZATION_TEST_CASES.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    optimizer = Optimizer()
    scen = load_module(os.path.join(REC_DIR, "rec_scenarios.py"), "rec_scenarios")
    generated_at = datetime.now(timezone.utc).isoformat()

    # test na scenariuszach 1 (bez automatyki), 3 (Decathlon), 4 (nowoczesny z brakami energii/flex)
    ids = [1, 3, 4]
    chosen = [s for s in scen.REC_SCENARIOS if s["id"] in ids]
    results = [optimizer.roadmap(s) for s in chosen]

    write_grouping_rules(optimizer, generated_at)
    write_model_md(optimizer, generated_at)
    write_roadmap_engine_md(optimizer, generated_at)
    write_test_cases_md(optimizer, results, generated_at)

    print("=" * 72)
    print("SRI OPTIMIZATION ENGINE — RAPORT")
    print("=" * 72)
    print(f"\nCapability przypisanych do etapow: {len(optimizer.capcat)} (pelne pokrycie)")
    stage_counts = defaultdict(int)
    for c in optimizer.capcat:
        stage_counts[optimizer.cap_stage(c)] += 1
    for k in range(1, 6):
        print(f"  - Etap {k} ({optimizer.opt.STAGES[k-1]['name'][:34]}): {stage_counts[k]} capability")

    for res in results:
        s = res["scenario"]
        print(f"\n[{s['id']}] {s['title']}")
        if res["errors"]:
            print("   WEJSCIE Z BLEDAMI")
            continue
        print(f"   SRI: {res['base_pct']}% ({res['class']}) -> {res['final_pct']}% po roadmapie")
        for st in res["stages"]:
            na = len(st["actions"])
            print(f"     Etap {st['stage']}: {st['sri_before']}% -> {st['sri_after']}% (+{st['gain']}) "
                  f"| akcji={na} | blokery={len(st['hardware_blockers'])}")

    print("\nWygenerowano 4 pliki w docs/sri/optimization/")
    print("=" * 72)


if __name__ == "__main__":
    main()
