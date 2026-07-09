# -*- coding: utf-8 -*-
"""Generuje statyczny snapshot referencyjnego raportu audytu SRI (do podglądu w repo).

Używa silnika obliczeniowego (parytet z runtime TS) oraz wersjonowanych artefaktów
generated/eu-sri-v4.5/** (graf rekomendacji + reguły optymalizacji). Wynik:
  docs/audit/mvp/REFERENCE_AUDIT_REPORT.md

Scenariusz identyczny jak lib/sri/reference.ts (budynek niemieszkalny, north_europe).
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "engine"))
sys.path.insert(0, os.path.dirname(__file__))
import sri_engine as E  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GEN = os.path.join(ROOT, "generated", "eu-sri-v4.5")
OUT = os.path.join(ROOT, "docs", "audit", "mvp", "REFERENCE_AUDIT_REPORT.md")

DOMAIN_MATURITY = {
    "heating": 0.75, "lighting": 0.8, "monitoring_and_control": 0.7, "ventilation": 0.5,
    "cooling": 0.5, "domestic_hot_water": 0.4, "electricity": 0.45,
    "dynamic_building_envelope": 0.25, "electric_vehicle_charging": 0.3,
}
CRITERION_PL = {
    "energy_efficiency": "Efektywność energetyczna",
    "maintenance_and_fault_prediction": "Utrzymanie i predykcja awarii",
    "comfort": "Komfort", "convenience": "Wygoda",
    "health_wellbeing_accessibility": "Zdrowie i dostępność",
    "information_to_occupants": "Informacja dla użytkowników",
    "energy_flexibility_and_storage": "Elastyczność energetyczna",
}


def payload(*parts):
    with open(os.path.join(GEN, *parts), encoding="utf-8") as f:
        return json.load(f)["payload"]


def main():
    cat = E.Catalogue()
    svcs = {}
    for c, d in cat.service_domain.items():
        fl = cat.service_flmax[c]
        svcs[c] = min(fl, round(fl * DOMAIN_MATURITY.get(d, 0.5)))
    assess = {"building_type": "non_residential", "climate_zone": "north_europe", "services": svcs}
    errs = E.validate_assessment(cat, assess)
    if errs:
        raise SystemExit(f"Walidacja nie przeszła: {errs[:5]}")
    res = E.compute_sri(cat, assess)

    rec_graph = payload("recommendation-graph.json")["recommendations"]
    opt = payload("optimization-rules.json")
    cap_stage = opt["capability_stage"]
    domains_pl = {d["code"]: d["official_name_pl"] for d in payload("catalogue", "domains.json")}

    # rekomendacje dla luk (parytet z lib/sri/recommendation.ts)
    recs = []
    for code, level in svcs.items():
        r = rec_graph.get(code)
        if not r or level >= r["fl_max"]:
            continue
        caps = [f["capability"] for f in r["technical_recommendation"]["functions_to_implement"]]
        recs.append({
            "code": code, "name_pl": r["name_pl"], "domain_pl": r["domain_pl"],
            "current": level, "target": r["technical_recommendation"]["target_level"],
            "priority": r["priority"]["level"], "priority_score": r["priority"]["score"],
            "rank": r["ranking"]["rank"],
            "gain": r["expected_improvement"]["total_expected_gain_percent"],
            "caps": caps,
        })
    recs.sort(key=lambda x: (-x["priority_score"], x["rank"]))

    # roadmap (parytet z lib/sri/optimization.ts)
    by_stage = {}
    for r in recs:
        stages = [cap_stage[c] for c in r["caps"] if c in cap_stage]
        sid = min(stages) if stages else 3
        by_stage.setdefault(sid, []).append(r)

    L = []
    a = L.append
    a("# Referencyjny audyt SRI — raport (snapshot)")
    a("")
    a("> Wygenerowane przez `store/SRI/mvp_reference_report.py` (parytet z runtime TS).")
    a("> Podgląd na żywo w aplikacji: `/audyt/przyklad`.")
    a("")
    a(f"- Metodologia: `eu-sri-v4.5`")
    a(f"- Budynek: `non_residential` · Strefa: `north_europe`")
    a(f"- Usługi ocenione: {len(svcs)} · Luki (level < FLmax): {sum(1 for c,l in svcs.items() if l < cat.service_flmax[c])}")
    a("")
    a("## Wynik")
    a("")
    a(f"**SRI: {res['sri_percent']:.2f}%** — klasa **{res['class_label']}** (nr {res['class_number']})")
    a("")
    a("## Wynik per kryterium (SR)")
    a("")
    a("| Kryterium | SR |")
    a("|---|---|")
    for ic in E.CRITERIA:
        a(f"| {CRITERION_PL.get(ic, ic)} | {res['sr_ic'][ic]*100:.1f}% |")
    a("")
    a("## Wynik per domena")
    a("")
    a("| Domena | achieved | max | % |")
    a("|---|---|---|---|")
    for d in res["present_domains"]:
        ach = sum(res["achieved"][(d, ic)] for ic in E.CRITERIA)
        mx = sum(res["maxposs"][(d, ic)] for ic in E.CRITERIA)
        pct = f"{ach/mx*100:.0f}%" if mx > 0 else "—"
        a(f"| {domains_pl.get(d, d)} | {ach} | {mx} | {pct} |")
    a("")
    a(f"## Rekomendacje ({len(recs)})")
    a("")
    a("| Usługa | Domena | Poziom → cel | Priorytet | Oczekiwany zysk |")
    a("|---|---|---|---|---|")
    for r in recs:
        a(f"| {r['code']} — {r['name_pl']} | {r['domain_pl']} | {r['current']} → {r['target']} | {r['priority']} | {r['gain']:.3f}% |")
    a("")
    a("## Roadmap modernizacji")
    a("")
    for stage in opt["stages"]:
        items = by_stage.get(stage["id"], [])
        a(f"### Etap {stage['id']}: {stage['name']} ({len(items)} działań)")
        a("")
        a(f"_{stage['description']}_")
        a("")
        for r in items:
            a(f"- {r['code']} — {r['name_pl']} ({r['domain_pl']}) · priorytet {r['priority']}")
        a("")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print(f"Zapisano {os.path.relpath(OUT, ROOT)}")
    print(f"SRI {res['sri_percent']:.2f}% klasa {res['class_label']}, rekomendacji {len(recs)}")


if __name__ == "__main__":
    main()
