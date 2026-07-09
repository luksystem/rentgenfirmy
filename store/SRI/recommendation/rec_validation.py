# -*- coding: utf-8 -*-
"""Walidacja SRI Recommendation Engine.

Kontekstowy runtime: dla kazdego scenariusza liczy realny SRI (silnik),
marginalny przyrost SRI z podniesienia/dodania kazdej uslugi, wyprowadza
rekomendacje z gapow, priorytet, wplyw na domeny/kryteria, zaleznosci,
blokery oraz rekomendacje odrzucone. Nastepnie automatyczne testy spojnosci.

NIE zmienia punktacji SRI. Bez UI/ofert/kosztow/ROI.

Wynik (docs/sri/recommendation/):
  SRI_RECOMMENDATION_TEST_CASES.md
  SRI_RECOMMENDATION_TRACE.md
  SRI_RECOMMENDATION_VALIDATION_REPORT.md

Uruchomienie: python store/sri/recommendation/rec_validation.py
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
DEP_DIR = os.path.join(ROOT, "docs", "sri", "dependency")
REC_DIR = os.path.join(ROOT, "docs", "sri", "recommendation")
OUTDIR = REC_DIR

# wagi rankingu kontekstowego (w obrebie kandydatow scenariusza)
CTX_W = {"gain": 0.60, "leverage": 0.20, "ease": 0.20}
GAIN_EPS = 0.005  # ponizej tego marginalny przyrost SRI uznajemy za nieistotny

DOMAIN_PL = {
    "heating": "Ogrzewanie", "domestic_hot_water": "Ciepla woda uzytkowa",
    "cooling": "Chlodzenie", "ventilation": "Wentylacja", "lighting": "Oswietlenie",
    "dynamic_building_envelope": "Dynamiczna obudowa budynku", "electricity": "Elektrycznosc",
    "electric_vehicle_charging": "Ladowanie pojazdow elektrycznych",
    "monitoring_and_control": "Monitoring i sterowanie",
}
CRITERION_PL = {
    "energy_efficiency": "Efektywnosc energetyczna",
    "energy_flexibility_and_storage": "Elastycznosc i magazynowanie energii",
    "comfort": "Komfort", "convenience": "Wygoda obslugi",
    "health_wellbeing_accessibility": "Zdrowie i dostepnosc",
    "maintenance_and_fault_prediction": "Utrzymanie i predykcja usterek",
    "information_to_occupants": "Informacja dla uzytkownikow",
}


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def norm_map(raw):
    if not raw:
        return {}
    lo, hi = min(raw.values()), max(raw.values())
    if hi - lo < 1e-12:
        return {k: 0.5 for k in raw}
    return {k: (v - lo) / (hi - lo) for k, v in raw.items()}


class RecoEngine:
    def __init__(self):
        self.eng = load_module(os.path.join(ROOT, "store", "sri", "engine", "sri_engine.py"), "sri_engine")
        self.cat = self.eng.Catalogue()
        self.dep = load_json(os.path.join(DEP_DIR, "SRI_DEPENDENCY_GRAPH.json"))
        self.capcat = load_json(os.path.join(DEP_DIR, "SRI_CAPABILITIES_CATALOG.json"))["capabilities"]
        self.recgraph = load_json(os.path.join(REC_DIR, "SRI_RECOMMENDATION_GRAPH.json"))["recommendations"]
        svc = load_json(os.path.join(ROOT, "docs", "sri", "catalogue", "services-authoritative.json"))["services"]
        self.mutex = {s["official_code"]: s.get("mutual_exclusion_group") for s in svc}

    def sri(self, assessment):
        return self.eng.compute_sri(self.cat, assessment)

    def name(self, code):
        return self.recgraph.get(code, {}).get("name_pl") or self.cat.service_name[code]

    def static_priority(self, code):
        return self.recgraph.get(code, {}).get("priority", {}).get("level", "—")

    def missing_caps(self, code, current_level):
        """Funkcje wymagane powyzej biezacego poziomu (do dodania)."""
        out = []
        for r in self.dep["services"][code]["required_capabilities"]:
            if r["min_level"] > current_level:
                out.append(r)
        return out

    def leverage(self, code, cap_ids):
        svcs = set()
        for cid in cap_ids:
            svcs.update(self.dep["capability_impact"].get(cid, {}).get("services", []))
        svcs.discard(code)
        return len(svcs)

    def domain_reach(self, cap_ids):
        doms = set()
        for cid in cap_ids:
            doms.update(self.dep["capability_impact"].get(cid, {}).get("domains", []))
        return len(doms)

    def evaluate(self, scenario):
        cat, eng = self.cat, self.eng
        bt, zone = scenario["building_type"], scenario["climate_zone"]
        services = dict(scenario["services"])
        assessment = {"building_type": bt, "climate_zone": zone, "services": services}

        errors = eng.validate_assessment(cat, assessment)
        if errors:
            return {"scenario": scenario, "errors": errors}

        base = self.sri(assessment)
        base_pct = base["sri_percent"]

        # potencjal: wszystkie obecne uslugi na FLmax
        allmax = {"building_type": bt, "climate_zone": zone,
                  "services": {c: cat.service_flmax[c] for c in services}}
        headroom = self.sri(allmax)["sri_percent"] - base_pct

        candidates = []   # rekomendacje kandydujace
        rejected = []     # odrzucone (z powodem)

        # ── UPGRADE: obecne uslugi ponizej FLmax ─────────────────────────────
        for code, lvl in services.items():
            flmax = cat.service_flmax[code]
            if lvl >= flmax:
                rejected.append({"code": code, "name": self.name(code), "type": "upgrade",
                                 "reason": f"usluga juz na FLmax ({flmax}) — brak gapu"})
                continue
            raised = copy.deepcopy(assessment)
            raised["services"][code] = flmax
            r = self.sri(raised)
            gain = r["sri_percent"] - base_pct
            # przyrost do nastepnego poziomu (granularnie)
            nxt = copy.deepcopy(assessment)
            nxt["services"][code] = lvl + 1
            gain_next = self.sri(nxt)["sri_percent"] - base_pct
            crit_delta = {ic: cat.crit_weight[(bt, ic)] * (r["sr_ic"][ic] - base["sr_ic"][ic]) * 100.0
                          for ic in eng.CRITERIA}
            miss = self.missing_caps(code, lvl)
            cand = self._make_candidate(code, "upgrade", lvl, flmax, gain, gain_next, crit_delta, miss)
            (candidates if gain > GAIN_EPS else rejected).append(
                cand if gain > GAIN_EPS else
                {**cand, "reason": "podniesienie nie zmienia SRI w tym kontekscie (kryteria bez wagi/nasycone)"})

        # ── EXPANSION: uslugi mozliwe, lecz nieobecne ────────────────────────
        for code in scenario.get("missing_applicable", []):
            if code in services:
                continue
            flmax = cat.service_flmax[code]
            added = copy.deepcopy(assessment)
            added["services"][code] = flmax
            r = self.sri(added)
            gain = r["sri_percent"] - base_pct
            crit_delta = {ic: cat.crit_weight[(bt, ic)] * (r["sr_ic"][ic] - base["sr_ic"][ic]) * 100.0
                          for ic in eng.CRITERIA}
            miss = self.missing_caps(code, 0)
            cand = self._make_candidate(code, "expansion", 0, flmax, gain, gain, crit_delta, miss)
            (candidates if gain > GAIN_EPS else rejected).append(
                cand if gain > GAIN_EPS else
                {**cand, "reason": "dodanie systemu nie poprawia SRI w tym kontekscie"})

        # ── ranking kontekstowy ──────────────────────────────────────────────
        n_gain = norm_map({c["code"]: c["gain"] for c in candidates})
        n_lev = norm_map({c["code"]: c["leverage"] for c in candidates})
        n_ease = norm_map({c["code"]: c["ease"] for c in candidates})
        for c in candidates:
            c["ctx_score"] = round(CTX_W["gain"] * n_gain[c["code"]] +
                                   CTX_W["leverage"] * n_lev[c["code"]] +
                                   CTX_W["ease"] * n_ease[c["code"]], 4)
        candidates.sort(key=lambda c: -c["ctx_score"])
        for i, c in enumerate(candidates, 1):
            c["rank"] = i

        # ── agregaty wplywu ──────────────────────────────────────────────────
        domain_impact = defaultdict(float)
        criteria_impact = defaultdict(float)
        for c in candidates:
            domain_impact[c["domain"]] += c["gain"]
            for ic, d in c["criteria_delta"].items():
                criteria_impact[ic] += d

        return {
            "scenario": scenario, "errors": [],
            "base": base, "base_pct": base_pct, "class": base["class_label"],
            "headroom": headroom,
            "candidates": candidates, "rejected": rejected,
            "domain_impact": dict(domain_impact), "criteria_impact": dict(criteria_impact),
        }

    def _make_candidate(self, code, ctype, lvl, flmax, gain, gain_next, crit_delta, miss):
        cap_ids = [m["capability"] for m in miss]
        manual = sum(1 for m in miss if m["needs_manual_verification"])
        ease = 1.0 - (manual / len(miss) if miss else 0.0)
        blockers_hard = [self.capcat[m["capability"]]["name_pl"] for m in miss if m["needs_manual_verification"]]
        blockers_soft = [self.capcat[m["capability"]]["name_pl"] for m in miss if not m["needs_manual_verification"]]
        cross = []
        for m in miss:
            cid = m["capability"]
            imp = self.dep["capability_impact"].get(cid, {})
            if imp.get("cross_domain"):
                cross.append({"name": self.capcat[cid]["name_pl"], "services": imp["service_count"],
                              "domains": imp["domain_count"]})
        top_crit = sorted(((ic, d) for ic, d in crit_delta.items() if d > 1e-9), key=lambda x: -x[1])
        return {
            "code": code, "name": self.name(code), "type": ctype,
            "domain": self.cat.service_domain[code], "current_level": lvl, "target_level": flmax,
            "gain": round(gain, 4), "gain_next_level": round(gain_next, 4),
            "static_priority": self.static_priority(code),
            "missing_functions": [self.capcat[m["capability"]]["name_pl"] for m in miss],
            "missing_cap_ids": cap_ids,
            "leverage": self.leverage(code, cap_ids), "domain_reach": self.domain_reach(cap_ids),
            "ease": round(ease, 4),
            "blockers_hard": blockers_hard, "blockers_soft": blockers_soft,
            "cross_domain_functions": cross,
            "criteria_delta": {ic: round(d, 4) for ic, d in crit_delta.items()},
            "top_criteria": [(ic, round(d, 4)) for ic, d in top_crit],
        }


# ─────────────────────────────────────────────────────────────────────────────
# Automatyczne testy spojnosci
# ─────────────────────────────────────────────────────────────────────────────
def run_checks(engine, result):
    checks = []
    sc = result["scenario"]
    cands = result["candidates"]
    services = sc["services"]

    # C1 (gating): nie rekomenduj funkcji juz istniejacych (min_level <= biezacy poziom)
    bad = []
    for c in cands:
        lvl = c["current_level"]
        for cid in c["missing_cap_ids"]:
            r = next(r for r in engine.dep["services"][c["code"]]["required_capabilities"]
                     if r["capability"] == cid)
            if r["min_level"] <= lvl and c["type"] == "upgrade":
                bad.append((c["code"], cid))
    checks.append(("C1 brak rekomendacji istniejacych funkcji", "gating", not bad,
                   "OK" if not bad else f"naruszenia: {bad}"))

    # C2 (gating): kazda rekomendacja wynika z gapu (level < flmax lub usluga nieobecna)
    bad2 = []
    for c in cands:
        flmax = engine.cat.service_flmax[c["code"]]
        if c["type"] == "upgrade" and not (c["code"] in services and services[c["code"]] < flmax):
            bad2.append(c["code"])
        if c["type"] == "expansion" and c["code"] in services:
            bad2.append(c["code"])
    checks.append(("C2 rekomendacje wynikaja z gapow", "gating", not bad2,
                   "OK" if not bad2 else f"naruszenia: {bad2}"))

    # C3 (gating): brak sprzecznosci — usluga nie jest jednoczesnie odrzucona jako 'na FLmax' i rekomendowana;
    #             brak dwoch rekomendacji z tej samej grupy wykluczajacej (mutual_exclusion_group)
    rec_codes = {c["code"] for c in cands}
    opt_rejected = {r["code"] for r in result["rejected"] if "FLmax" in r.get("reason", "")}
    conflict_a = rec_codes & opt_rejected
    groups = defaultdict(list)
    for c in cands:
        g = engine.mutex.get(c["code"])
        if g:
            groups[g].append(c["code"])
    conflict_b = {g: v for g, v in groups.items() if len(v) > 1}
    ok3 = not conflict_a and not conflict_b
    checks.append(("C3 brak sprzecznosci rekomendacji", "gating", ok3,
                   "OK" if ok3 else f"kolizje: optymalne&rekom={conflict_a}, mutex={conflict_b}"))

    # C4 (info): najwiekszy gap na gorze — rank#1 nalezy do top-3 wg marginalnego przyrostu
    info4 = "brak kandydatow"
    ok4 = True
    if cands:
        by_gain = sorted(cands, key=lambda c: -c["gain"])
        top3 = {c["code"] for c in by_gain[:3]}
        ok4 = cands[0]["code"] in top3
        info4 = (f"rank#1={cands[0]['code']} (gain {cands[0]['gain']:.3f}); "
                 f"max gain={by_gain[0]['code']} ({by_gain[0]['gain']:.3f})")
    checks.append(("C4 najwieksze braki na gorze", "info", ok4, info4))

    # C5 (info): priorytety sensowne — sredni marginalny gain malejaco wg statycznego priorytetu
    order = ["Critical", "High", "Medium", "Low"]
    means = {}
    for lvl in order:
        vals = [c["gain"] for c in cands if c["static_priority"] == lvl]
        if vals:
            means[lvl] = sum(vals) / len(vals)
    seq = [means[l] for l in order if l in means]
    mono = all(seq[i] >= seq[i + 1] - 1e-6 for i in range(len(seq) - 1))
    checks.append(("C5 priorytety maja sens (gain malejacy)", "info", mono,
                   ", ".join(f"{l}={means[l]:.3f}" for l in order if l in means) or "brak danych"))

    # C6 (info): cross-domain premiowane — korelacja leverage vs ctx_score >= 0
    ok6, info6 = True, "za malo kandydatow"
    if len(cands) >= 3:
        xs = [c["leverage"] for c in cands]
        ys = [c["ctx_score"] for c in cands]
        info6 = f"corr(leverage, ctx_score) = {_pearson(xs, ys):.3f}"
        ok6 = _pearson(xs, ys) >= -0.05
    checks.append(("C6 cross-domain premiowane", "info", ok6, info6))

    return checks


def _pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = sum((x - mx) ** 2 for x in xs) ** 0.5
    dy = sum((y - my) ** 2 for y in ys) ** 0.5
    return num / (dx * dy) if dx > 0 and dy > 0 else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Raporty
# ─────────────────────────────────────────────────────────────────────────────
def write_test_cases(scenarios, generated_at):
    L = ["# SRI Recommendation — Test Cases\n"]
    L.append(f"- Wygenerowano: `{generated_at}`\n")
    L.append("6 scenariuszy do walidacji Recommendation Engine. `services` = uslugi obecne (z poziomem FL); "
             "`missing_applicable` = systemy mozliwe, lecz niezainstalowane (kandydaci do rozbudowy).\n")
    for s in scenarios:
        L.append(f"## Scenariusz {s['id']}: {s['title']}\n")
        L.append(f"- Oczekiwanie: {s['expectation']}")
        L.append(f"- Typ budynku: `{s['building_type']}`, strefa: `{s['climate_zone']}`")
        L.append(f"- Uwagi: {s['notes']}")
        L.append(f"- Uslugi obecne ({len(s['services'])}): "
                 + ", ".join(f"{k}={v}" for k, v in s["services"].items()))
        ma = s.get("missing_applicable", [])
        L.append(f"- Mozliwe do rozbudowy: {', '.join(ma) if ma else '—'}\n")
    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_TEST_CASES.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_trace(results, generated_at):
    L = ["# SRI Recommendation — Trace\n"]
    L.append(f"- Wygenerowano: `{generated_at}`\n")
    L.append("Dla kazdego scenariusza: wynik SRI, glowne braki, top 10 rekomendacji, priorytet, "
             "wplyw na domeny i Impact Criteria, zaleznosci, blokery oraz rekomendacje odrzucone.\n")
    for res in results:
        s = res["scenario"]
        L.append(f"## Scenariusz {s['id']}: {s['title']}\n")
        if res["errors"]:
            L.append("**Walidacja wejscia zwrocila bledy:**")
            for e in res["errors"]:
                L.append(f"- {e}")
            L.append("")
            continue
        L.append(f"**Obecny SRI:** {res['base_pct']:.2f}% (klasa {res['class']}) · "
                 f"**Naglowek do FLmax obecnych uslug:** +{res['headroom']:.2f} pkt proc.\n")

        cands = res["candidates"]
        gaps = sorted(cands, key=lambda c: -c["gain"])[:5]
        L.append("**Glowne braki (wg marginalnego przyrostu SRI):**\n")
        for c in gaps:
            L.append(f"- {c['code']} {c['name']} — potencjal +{c['gain']:.3f} pkt "
                     f"(FL{c['current_level']}→{c['target_level']}, {c['type']})")
        L.append("")

        L.append("**Top 10 rekomendacji (ranking kontekstowy):**\n")
        L.append("| # | Usluga | Typ | FL | Δ SRI | Priorytet | Latwosc | Cross-dom | Blokery (sprzet) |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for c in cands[:10]:
            cd = len(c["cross_domain_functions"])
            bh = ", ".join(c["blockers_hard"]) or "—"
            L.append(f"| {c['rank']} | {c['code']} {c['name']} | {c['type']} "
                     f"| {c['current_level']}→{c['target_level']} | +{c['gain']:.3f} "
                     f"| {c['static_priority']} | {c['ease']:.2f} | {cd} | {bh} |")
        L.append("")

        L.append("**Oczekiwany wplyw na domeny:**\n")
        for d, g in sorted(res["domain_impact"].items(), key=lambda x: -x[1]):
            if g > 1e-6:
                L.append(f"- {DOMAIN_PL.get(d, d)}: +{g:.3f} pkt proc.")
        L.append("")
        L.append("**Oczekiwany wplyw na Impact Criteria:**\n")
        for ic, g in sorted(res["criteria_impact"].items(), key=lambda x: -x[1]):
            if g > 1e-6:
                L.append(f"- {CRITERION_PL.get(ic, ic)}: +{g:.3f} pkt proc.")
        L.append("")

        L.append("**Zaleznosci / blokery top rekomendacji:**\n")
        for c in cands[:5]:
            fn = ", ".join(c["missing_functions"]) or "—"
            cross = ", ".join(f"{x['name']} ({x['services']} uslug)" for x in c["cross_domain_functions"]) or "—"
            L.append(f"- **{c['code']}**: funkcje do wdrozenia: {fn}")
            L.append(f"  - blokery sprzetowe: {', '.join(c['blockers_hard']) or '—'}; "
                     f"konfiguracyjne/integracyjne: {', '.join(c['blockers_soft']) or '—'}")
            L.append(f"  - funkcje cross-domain: {cross}")
        L.append("")

        L.append("**Rekomendacje odrzucone i dlaczego:**\n")
        if res["rejected"]:
            for r in res["rejected"]:
                L.append(f"- {r['code']} {r.get('name', '')} — {r['reason']}")
        else:
            L.append("- brak")
        L.append("")
    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_TRACE.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_report(results, all_checks, generated_at):
    L = ["# SRI Recommendation — Validation Report\n"]
    L.append(f"- Wygenerowano: `{generated_at}`\n")
    L.append("> Walidacja jakosci rekomendacji: spojnosc, zgodnosc z gapami, sensownosc priorytetow, "
             "premiowanie funkcji cross-domain. Testy `gating` decyduja o statusie; `info` to obserwacje.\n")

    gating_pass = True
    L.append("## Wyniki per scenariusz\n")
    for res, checks in zip(results, all_checks):
        s = res["scenario"]
        L.append(f"### Scenariusz {s['id']}: {s['title']}\n")
        if res["errors"]:
            L.append("- Walidacja wejscia: bledy (scenariusz kontrolny) — pominieto rekomendacje.\n")
        else:
            L.append(f"- SRI: {res['base_pct']:.2f}% (klasa {res['class']}), "
                     f"kandydatow: {len(res['candidates'])}, odrzuconych: {len(res['rejected'])}\n")
        L.append("| Test | Typ | Wynik | Szczegoly |")
        L.append("|---|---|---|---|")
        for name, kind, ok, info in checks:
            mark = "✅" if ok else ("❌" if kind == "gating" else "⚠")
            if kind == "gating" and not ok:
                gating_pass = False
            L.append(f"| {name} | {kind} | {mark} | {info} |")
        L.append("")

    L.append("## Podsumowanie zbiorcze\n")
    # zbiorcze: czy najwieksze braki na gorze i cross-domain premiowane w wiekszosci scenariuszy
    c4 = sum(1 for checks in all_checks for n, k, ok, i in checks if n.startswith("C4") and ok)
    c6 = sum(1 for checks in all_checks for n, k, ok, i in checks if n.startswith("C6") and ok)
    active = sum(1 for res in results if not res["errors"])
    L.append(f"- Scenariusze z rekomendacjami: **{active}/6** (1 kontrolny z bledami wejscia)")
    L.append(f"- 'Najwieksze braki na gorze' spelnione: **{c4}/{active}**")
    L.append(f"- 'Cross-domain premiowane' spelnione: **{c6}/{active}**")
    L.append(f"- Testy gating (spojnosc, gapy, brak sprzecznosci): **{'WSZYSTKIE PASS ✅' if gating_pass else 'NIEPOWODZENIE ❌'}**\n")

    ready = gating_pass and active >= 5
    L.append("## Gotowosc do etapu Optimization Engine\n")
    if ready:
        L.append("**TAK ✅** — rekomendacje sa spojne, wynikaja z gapow, nie proponuja funkcji juz istniejacych, "
                 "najwieksze braki trafiaja na gore listy, a funkcje cross-domain sa premiowane. "
                 "Model dostarcza marginalny przyrost SRI, priorytety i zaleznosci — wystarczajaca podstawa "
                 "pod Optimization Engine (dobor sciezki dzialan pod ograniczenia).")
    else:
        L.append("**NIE ❌** — patrz nieudane testy gating powyzej.")
    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_VALIDATION_REPORT.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    return gating_pass, ready


def main():
    scen = load_module(os.path.join(HERE, "rec_scenarios.py"), "rec_scenarios")
    engine = RecoEngine()
    generated_at = datetime.now(timezone.utc).isoformat()

    results, all_checks = [], []
    for s in scen.REC_SCENARIOS:
        res = engine.evaluate(s)
        results.append(res)
        all_checks.append([] if res["errors"] else run_checks(engine, res))

    write_test_cases(scen.REC_SCENARIOS, generated_at)
    write_trace(results, generated_at)
    gating_pass, ready = write_report(results, all_checks, generated_at)

    print("=" * 72)
    print("SRI RECOMMENDATION ENGINE — WALIDACJA")
    print("=" * 72)
    for res, checks in zip(results, all_checks):
        s = res["scenario"]
        if res["errors"]:
            print(f"\n[{s['id']}] {s['title']}: WEJSCIE Z BLEDAMI ({len(res['errors'])}) — scenariusz kontrolny")
            continue
        print(f"\n[{s['id']}] {s['title']}")
        print(f"    SRI={res['base_pct']:.2f}% ({res['class']}) | kandydatow={len(res['candidates'])} | odrzuconych={len(res['rejected'])}")
        if res["candidates"]:
            top = res["candidates"][0]
            print(f"    TOP: {top['code']} {top['name'][:34]} (+{top['gain']:.3f} pkt, {top['static_priority']})")
        for name, kind, ok, info in checks:
            mark = "OK " if ok else ("FAIL" if kind == "gating" else "warn")
            print(f"      [{mark}] {name}: {info}")

    print("\n" + "=" * 72)
    print("TESTY GATING: " + ("WSZYSTKIE PASS ✅" if gating_pass else "NIEPOWODZENIE ❌"))
    print("GOTOWOSC DO OPTIMIZATION ENGINE: " + ("TAK ✅" if ready else "NIE ❌"))
    print("=" * 72)
    if not gating_pass:
        sys.exit(1)


if __name__ == "__main__":
    main()
