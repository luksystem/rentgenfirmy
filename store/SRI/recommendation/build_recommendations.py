# -*- coding: utf-8 -*-
"""SRI Recommendation Engine — builder.

Laczy oficjalny katalog SRI (silnik), karty wiedzy i graf zaleznosci i generuje
warstwe rekomendacji (advisory). NIE zmienia punktacji SRI. Bez UI/ofert/kosztow/ROI.

Wynik (docs/sri/recommendation/):
  SRI_EXPECTED_GAIN_MODEL.json   — potencjal SRI per usluga (per building_type, per kryterium)
  SRI_RECOMMENDATION_GRAPH.json  — pelne rekomendacje 54 uslug (7 sekcji) + priorytet + ranking
  SRI_RECOMMENDATION_MODEL.md    — opis modelu + karty rekomendacji
  SRI_PRIORITY_ENGINE.md         — algorytm priorytetu i rankingu + wyniki

Uruchomienie: python store/sri/recommendation/build_recommendations.py
"""

import glob
import importlib.util
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean

sys.stdout.reconfigure(encoding="utf-8")

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
KNOWLEDGE_DIR = os.path.join(ROOT, "docs", "sri", "knowledge")
DEP_DIR = os.path.join(ROOT, "docs", "sri", "dependency")
OUTDIR = os.path.join(ROOT, "docs", "sri", "recommendation")
ENGINE_VERSION = "1.0.0"

DOMAIN_PL = {
    "heating": "Ogrzewanie",
    "domestic_hot_water": "Ciepla woda uzytkowa",
    "cooling": "Chlodzenie",
    "ventilation": "Wentylacja",
    "lighting": "Oswietlenie",
    "dynamic_building_envelope": "Dynamiczna obudowa budynku",
    "electricity": "Elektrycznosc",
    "electric_vehicle_charging": "Ladowanie pojazdow elektrycznych",
    "monitoring_and_control": "Monitoring i sterowanie",
}
CRITERION_PL = {
    "energy_efficiency": "Efektywnosc energetyczna",
    "energy_flexibility_and_storage": "Elastycznosc i magazynowanie energii",
    "comfort": "Komfort",
    "convenience": "Wygoda obslugi",
    "health_wellbeing_accessibility": "Zdrowie i dostepnosc",
    "maintenance_and_fault_prediction": "Utrzymanie i predykcja usterek",
    "information_to_occupants": "Informacja dla uzytkownikow",
}


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_knowledge():
    cards = {}
    for path in glob.glob(os.path.join(KNOWLEDGE_DIR, "*.json")):
        if os.path.basename(path) == "index.json":
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        for card in data.get("cards", []):
            cards[card["official_code"]] = card
    return cards


# ─────────────────────────────────────────────────────────────────────────────
# Expected Gain — maksymalny potencjal uslugi w pelni wyposazonym budynku
# ─────────────────────────────────────────────────────────────────────────────
def compute_expected_gain(cat, eng):
    services_by_domain = defaultdict(list)
    for code, dom in cat.service_domain.items():
        services_by_domain[dom].append(code)

    eg = {}
    for bt in eng.BUILDING_TYPES:
        per_total = defaultdict(list)
        per_crit = defaultdict(lambda: defaultdict(list))
        for zone in eng.CLIMATE_ZONES:
            maxposs = {}
            for d in cat.domains:
                for ic in eng.CRITERIA:
                    maxposs[(d, ic)] = sum(cat.max_scores[c][ic] for c in services_by_domain[d])
            wnorm = {}
            for ic in eng.CRITERIA:
                contributing = [d for d in cat.domains if maxposs[(d, ic)] > 0]
                raw = {d: cat.domain_weight[(bt, zone, d, ic)] for d in contributing}
                tot = sum(raw.values())
                for d in cat.domains:
                    wnorm[(d, ic)] = (raw[d] / tot) if (d in raw and tot > 0) else 0.0
            for code in cat.service_domain:
                d = cat.service_domain[code]
                total = 0.0
                for ic in eng.CRITERIA:
                    mp = maxposs[(d, ic)]
                    contrib = (cat.crit_weight[(bt, ic)] * wnorm[(d, ic)] *
                               (cat.max_scores[code][ic] / mp) * 100.0) if mp > 0 else 0.0
                    per_crit[code][ic].append(contrib)
                    total += contrib
                per_total[code].append(total)
        eg[bt] = {}
        for code in cat.service_domain:
            by_ic = {ic: mean(per_crit[code][ic]) for ic in eng.CRITERIA}
            eg[bt][code] = {
                "total_percent": mean(per_total[code]),
                "by_criterion_percent": by_ic,
                "energy_percent": sum(by_ic[ic] for ic in ["energy_efficiency", "energy_flexibility_and_storage"]),
            }

    eg["combined"] = {}
    for code in cat.service_domain:
        by_ic = {ic: mean([eg[bt][code]["by_criterion_percent"][ic] for bt in eng.BUILDING_TYPES])
                 for ic in eng.CRITERIA}
        eg["combined"][code] = {
            "total_percent": mean([eg[bt][code]["total_percent"] for bt in eng.BUILDING_TYPES]),
            "by_criterion_percent": by_ic,
            "energy_percent": sum(by_ic[ic] for ic in ["energy_efficiency", "energy_flexibility_and_storage"]),
        }
    return eg, dict(services_by_domain)


def normalize_map(raw):
    lo = min(raw.values())
    hi = max(raw.values())
    if hi - lo < 1e-12:
        return {k: 0.5 for k in raw}
    return {k: (v - lo) / (hi - lo) for k, v in raw.items()}


def build():
    cfg = load_module(os.path.join(HERE, "recommendation_data.py"), "recommendation_data")
    eng = load_module(os.path.join(ROOT, "store", "sri", "engine", "sri_engine.py"), "sri_engine")
    cat = eng.Catalogue()
    cards = load_knowledge()

    with open(os.path.join(DEP_DIR, "SRI_DEPENDENCY_GRAPH.json"), encoding="utf-8") as fh:
        dep = json.load(fh)
    with open(os.path.join(DEP_DIR, "SRI_CAPABILITIES_CATALOG.json"), encoding="utf-8") as fh:
        capcat = json.load(fh)["capabilities"]

    eg, services_by_domain = compute_expected_gain(cat, eng)
    codes = sorted(cat.service_domain.keys())

    # ── cechy per usluga ──────────────────────────────────────────────────────
    feat = {}
    for code in codes:
        dsvc = dep["services"][code]
        reqs = dsvc["required_capabilities"]
        cap_ids = [r["capability"] for r in reqs]

        domain_reach = set()
        leverage = set()
        for cid in cap_ids:
            imp = dep["capability_impact"].get(cid, {})
            domain_reach.update(imp.get("domains", []))
            leverage.update(imp.get("services", []))
        leverage.discard(code)

        criteria_improved = [ic for ic in eng.CRITERIA if cat.max_scores[code][ic] > 0]
        manual = sum(1 for r in reqs if r["needs_manual_verification"])
        ease = 1.0 - (manual / len(reqs) if reqs else 0.0)
        depth = sum(r["min_level"] for r in reqs)  # glebokosc prerekwizytow

        feat[code] = {
            "gain": eg["combined"][code]["total_percent"],
            "energy": eg["combined"][code]["energy_percent"],
            "leverage": len(leverage),
            "domain_reach": len(domain_reach),
            "criteria": len(criteria_improved),
            "ease": ease,
            "depth": depth,
            "cap_ids": cap_ids,
            "criteria_improved": criteria_improved,
        }

    # ── normalizacja cech (min-max po 54 uslugach) ───────────────────────────
    n_gain = normalize_map({c: feat[c]["gain"] for c in codes})
    n_energy = normalize_map({c: feat[c]["energy"] for c in codes})
    n_leverage = normalize_map({c: feat[c]["leverage"] for c in codes})
    n_domains = normalize_map({c: feat[c]["domain_reach"] for c in codes})
    n_criteria = normalize_map({c: feat[c]["criteria"] for c in codes})
    n_ease = normalize_map({c: feat[c]["ease"] for c in codes})
    n_readiness = normalize_map({c: -feat[c]["depth"] for c in codes})  # plytsze = wyzej

    # ── priorytet i ranking ──────────────────────────────────────────────────
    pw = cfg.PRIORITY_WEIGHTS
    rw = cfg.RANKING_WEIGHTS
    priority_score = {}
    ranking_score = {}
    for c in codes:
        priority_score[c] = (pw["gain"] * n_gain[c] + pw["leverage"] * n_leverage[c] +
                             pw["domains"] * n_domains[c])
        ranking_score[c] = (rw["expected_gain"] * n_gain[c] + rw["energy_potential"] * n_energy[c] +
                            rw["ease"] * n_ease[c] + rw["service_leverage"] * n_leverage[c] +
                            rw["domains"] * n_domains[c] + rw["prereq_readiness"] * n_readiness[c] +
                            rw["criteria"] * n_criteria[c])

    def classify_priority(score):
        for label, thr in cfg.PRIORITY_THRESHOLDS:
            if score >= thr:
                return label
        return "Low"

    ranked = sorted(codes, key=lambda c: -ranking_score[c])
    rank_pos = {c: i + 1 for i, c in enumerate(ranked)}

    # ── budowa obiektow rekomendacji ─────────────────────────────────────────
    recs = {}
    for code in codes:
        dsvc = dep["services"][code]
        card = cards.get(code, {})
        domain = cat.service_domain[code]
        flmax = cat.service_flmax[code]
        egc = eg["combined"][code]

        friendly = card.get("friendly_name_pl") or cat.service_name[code]
        purpose = card.get("purpose_pl", "")
        energy_sig = card.get("energy_significance_pl", "")

        gap = (f"Brak lub niepelne wdrozenie: {friendly} (usluga {code}). {purpose}"
               + (f" Znaczenie energetyczne: {energy_sig}" if energy_sig else "")).strip()

        # Business impact — 6 wymiarow
        business_impact = []
        for key, label, crits in cfg.BUSINESS_DIMENSIONS:
            max_sc = max(cat.max_scores[code][ic] for ic in crits)
            eg_contrib = sum(egc["by_criterion_percent"][ic] for ic in crits)
            business_impact.append({
                "dimension": key, "label": label,
                "level": cfg.impact_level(max_sc),
                "max_impact_score": max_sc,
                "expected_gain_percent": round(eg_contrib, 4),
            })

        # Technical recommendation (funkcjonalnie, bez producenta)
        cap_names = []
        for r in sorted(dsvc["required_capabilities"], key=lambda r: (r["min_level"], r["capability"])):
            cid = r["capability"]
            cap_names.append({
                "capability": cid,
                "name_pl": capcat[cid]["name_pl"],
                "min_level": r["min_level"],
                "source_type": r["source_type"],
            })
        tech = {
            "target_level": flmax,
            "functions_to_implement": cap_names,
            "modernization_hints": card.get("modernization", []),
        }

        # Expected improvement
        criteria_increase = [{
            "criterion": ic, "label": CRITERION_PL[ic],
            "expected_gain_percent": round(egc["by_criterion_percent"][ic], 4),
        } for ic in eng.CRITERIA if cat.max_scores[code][ic] > 0]
        expected_improvement = {
            "domain": domain, "domain_pl": DOMAIN_PL[domain],
            "total_expected_gain_percent": round(egc["total_percent"], 4),
            "criteria_increase": sorted(criteria_increase, key=lambda x: -x["expected_gain_percent"]),
        }

        # Dependencies
        prereq_by_level = defaultdict(list)
        for r in dsvc["required_capabilities"]:
            prereq_by_level[r["min_level"]].append(capcat[r["capability"]]["name_pl"])
        implement_first = sorted(prereq_by_level.get(1, []))
        cross_functions = []
        for cid in feat[code]["cap_ids"]:
            imp = dep["capability_impact"].get(cid, {})
            if imp.get("cross_domain"):
                cross_functions.append({
                    "capability": cid, "name_pl": capcat[cid]["name_pl"],
                    "shared_by_services": imp["service_count"],
                    "domains": imp["domain_count"],
                })
        dependencies = {
            "implement_first": implement_first,
            "prerequisites_by_level": {str(k): sorted(v) for k, v in sorted(prereq_by_level.items())},
            "shared_cross_domain_functions": cross_functions,
            "related_services": card.get("dependencies", []),
        }

        # Verification
        ver_checks, ver_evidence = [], []
        for cid in feat[code]["cap_ids"]:
            ver_checks.append(capcat[cid]["verification"])
            ver_evidence.extend(capcat[cid]["evidence"])
        for x in card.get("audit_verification", []):
            ver_checks.append(x)
        ver_evidence.extend(card.get("evidence", []))
        verification = {
            "checks": sorted(set(ver_checks)),
            "evidence": sorted(set(ver_evidence)),
            "mark_uncertain_when": "brak dowodu lub dane niespojne/przestarzale -> needs_verification",
        }

        # Priority
        pscore = priority_score[code]
        priority = {
            "level": classify_priority(pscore),
            "score": round(pscore, 4),
            "factors": {
                "gain_norm": round(n_gain[code], 4),
                "leverage_norm": round(n_leverage[code], 4),
                "domains_norm": round(n_domains[code], 4),
            },
        }

        # Ranking
        ranking = {
            "rank": rank_pos[code],
            "score": round(ranking_score[code], 4),
            "factors": {
                "expected_gain": round(n_gain[code], 4),
                "energy_potential": round(n_energy[code], 4),
                "ease": round(n_ease[code], 4),
                "service_leverage": round(n_leverage[code], 4),
                "domains": round(n_domains[code], 4),
                "prereq_readiness": round(n_readiness[code], 4),
                "criteria": round(n_criteria[code], 4),
            },
        }

        recs[code] = {
            "code": code, "domain": domain, "domain_pl": DOMAIN_PL[domain],
            "name_pl": friendly, "name_en": cat.service_name[code], "fl_max": flmax,
            "gap_description": gap,
            "business_impact": business_impact,
            "technical_recommendation": tech,
            "expected_improvement": expected_improvement,
            "dependencies": dependencies,
            "verification": verification,
            "priority": priority,
            "ranking": ranking,
        }

    return cfg, eng, cat, eg, recs, feat, ranked, priority_score, ranking_score


# ─────────────────────────────────────────────────────────────────────────────
# Zapis wynikow
# ─────────────────────────────────────────────────────────────────────────────
def write_outputs(cfg, eng, cat, eg, recs, feat, ranked):
    os.makedirs(OUTDIR, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    codes = sorted(recs.keys())

    # Expected Gain model JSON
    gain_json = {
        "meta": {
            "engine": "SRI Recommendation Engine — Expected Gain Model",
            "engine_version": ENGINE_VERSION, "generated_at": generated_at,
            "role": "advisory_layer",
            "definition": ("Expected Gain = maksymalny udzial uslugi w calkowitym SRI, gdy usluga "
                           "przechodzi z braku (FL0) do FLmax w pelni wyposazonym budynku referencyjnym. "
                           "Suma po wszystkich uslugach ~ 100% dla kazdego typu budynku."),
            "criteria": eng.CRITERIA,
        },
        "expected_gain": {
            scope: {c: eg[scope][c] for c in codes}
            for scope in list(eng.BUILDING_TYPES) + ["combined"]
        },
        "totals_check": {
            scope: round(sum(eg[scope][c]["total_percent"] for c in codes), 4)
            for scope in list(eng.BUILDING_TYPES) + ["combined"]
        },
    }
    with open(os.path.join(OUTDIR, "SRI_EXPECTED_GAIN_MODEL.json"), "w", encoding="utf-8") as fh:
        json.dump(gain_json, fh, ensure_ascii=False, indent=2)

    # Recommendation graph JSON
    prio_counts = defaultdict(int)
    for c in codes:
        prio_counts[recs[c]["priority"]["level"]] += 1
    graph = {
        "meta": {
            "engine": "SRI Recommendation Engine", "engine_version": ENGINE_VERSION,
            "generated_at": generated_at, "role": "advisory_layer",
            "service_count": len(codes),
            "priority_distribution": dict(prio_counts),
            "priority_weights": cfg.PRIORITY_WEIGHTS,
            "ranking_weights": cfg.RANKING_WEIGHTS,
            "inputs": {
                "catalogue": "docs/sri/catalogue/",
                "dependency_graph": "docs/sri/dependency/SRI_DEPENDENCY_GRAPH.json",
                "knowledge": "docs/sri/knowledge/",
            },
        },
        "recommendations": recs,
        "ranking_order": ranked,
    }
    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_GRAPH.json"), "w", encoding="utf-8") as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)

    write_model_md(cfg, eng, cat, recs, generated_at)
    write_priority_md(cfg, eng, recs, feat, ranked, generated_at)
    return prio_counts


def write_model_md(cfg, eng, cat, recs, generated_at):
    L = ["# SRI Recommendation Model\n"]
    L.append("> Warstwa **pomocnicza (advisory)** nad oficjalna metodologia SRI. Nie zmienia punktacji. "
             "Odpowiada: dlaczego wynik jest niski, ktore braki wazą najwiecej, jakie dzialania podniosa wynik "
             "i co wdrozyc najpierw. Bez ofert, kosztow i ROI.\n")
    L.append(f"- Wygenerowano: `{generated_at}`")
    L.append(f"- Wersja: `{ENGINE_VERSION}`")
    L.append(f"- Uslug objetych: **{len(recs)} / 54**\n")
    L.append("## Struktura rekomendacji (7 sekcji na usluge)\n")
    L.append("1. **Gap Description** — co oznacza brak uslugi.")
    L.append("2. **Business Impact** — wplyw na 6 wymiarow (EE, komfort, utrzymanie, bezpieczenstwo, eksploatacja, elastycznosc).")
    L.append("3. **Technical Recommendation** — funkcje do wdrozenia (bez producenta).")
    L.append("4. **Expected Improvement** — domena i Impact Criteria, ktore wzrosna.")
    L.append("5. **Dependencies** — co wdrozyc wczesniej.")
    L.append("6. **Verification** — jak potwierdzic realizacje.")
    L.append("7. **Priority** — Critical / High / Medium / Low.\n")

    cur = None
    for code in sorted(recs, key=lambda c: (recs[c]["domain"], c)):
        r = recs[code]
        if r["domain"] != cur:
            cur = r["domain"]
            L.append(f"## {r['domain_pl']} (`{cur}`)\n")
        L.append(f"### {code} — {r['name_pl']} (FLmax {r['fl_max']})\n")
        L.append(f"**Priorytet:** {r['priority']['level']}  ·  "
                 f"**Ranking:** #{r['ranking']['rank']}  ·  "
                 f"**Expected Gain:** {r['expected_improvement']['total_expected_gain_percent']:.3f}% SRI\n")
        L.append(f"**1. Gap.** {r['gap_description']}\n")
        L.append("**2. Business Impact.**\n")
        L.append("| Wymiar | Poziom | Maks. impact score | Expected Gain |")
        L.append("|---|---|---|---|")
        for bi in r["business_impact"]:
            L.append(f"| {bi['label']} | {bi['level']} | {bi['max_impact_score']} | {bi['expected_gain_percent']:.3f}% |")
        L.append("")
        L.append("**3. Technical Recommendation** (funkcjonalnie, bez producenta):\n")
        for f in r["technical_recommendation"]["functions_to_implement"]:
            L.append(f"- {f['name_pl']} (od FL{f['min_level']}, {f['source_type']})")
        if r["technical_recommendation"]["modernization_hints"]:
            L.append(f"- _Kierunki modernizacji:_ {', '.join(r['technical_recommendation']['modernization_hints'])}")
        L.append(f"- _Cel:_ osiagniecie poziomu FL{r['technical_recommendation']['target_level']}.\n")
        L.append("**4. Expected Improvement.**\n")
        L.append(f"- Domena: {r['expected_improvement']['domain_pl']}")
        inc = "; ".join(f"{x['label']} (+{x['expected_gain_percent']:.3f}%)"
                        for x in r["expected_improvement"]["criteria_increase"])
        L.append(f"- Kryteria, ktore wzrosna: {inc or '—'}\n")
        L.append("**5. Dependencies.**\n")
        L.append(f"- Wdroz najpierw (FL1): {', '.join(r['dependencies']['implement_first']) or '—'}")
        if r["dependencies"]["shared_cross_domain_functions"]:
            sh = ", ".join(f"{x['name_pl']} ({x['shared_by_services']} uslug)"
                           for x in r["dependencies"]["shared_cross_domain_functions"])
            L.append(f"- Funkcje wspoldzielone miedzydomenowo: {sh}")
        if r["dependencies"]["related_services"]:
            L.append(f"- Powiazane uslugi: {', '.join(r['dependencies']['related_services'])}")
        L.append("")
        L.append("**6. Verification.**\n")
        for chk in r["verification"]["checks"][:6]:
            L.append(f"- {chk}")
        L.append(f"- _Dowody:_ {', '.join(r['verification']['evidence'][:8])}")
        L.append(f"- _Oznacz needs_verification, gdy:_ {r['verification']['mark_uncertain_when']}\n")
        L.append("---\n")

    with open(os.path.join(OUTDIR, "SRI_RECOMMENDATION_MODEL.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_priority_md(cfg, eng, recs, feat, ranked, generated_at):
    L = ["# SRI Priority & Ranking Engine\n"]
    L.append("> Algorytm priorytetu i kolejnosci wdrazania (advisory). Nie zmienia punktacji SRI.\n")
    L.append(f"- Wygenerowano: `{generated_at}`")
    L.append(f"- Wersja: `{ENGINE_VERSION}`\n")

    L.append("## 1. Priority (Critical / High / Medium / Low)\n")
    L.append("Znormalizowany wynik priorytetu:\n")
    L.append("```")
    L.append("priority = " + " + ".join(f"{w:.2f}*{k}" for k, w in cfg.PRIORITY_WEIGHTS.items()))
    L.append("```")
    L.append("gdzie skladniki (min-max po 54 uslugach):")
    L.append("- `gain` — Expected SRI Gain (potencjal wyniku),")
    L.append("- `leverage` — liczba innych uslug korzystajacych z tych samych funkcji,")
    L.append("- `domains` — liczba domen objetych funkcjami uslugi.\n")
    L.append("Progi:")
    for label, thr in cfg.PRIORITY_THRESHOLDS:
        L.append(f"- **{label}**: score ≥ {thr:.2f}")
    L.append("")
    dist = defaultdict(int)
    for c in recs:
        dist[recs[c]["priority"]["level"]] += 1
    L.append("Rozklad: " + ", ".join(f"{k}={dist[k]}" for k in ["Critical", "High", "Medium", "Low"]) + "\n")

    L.append("## 2. Recommendation Ranking (co wdrazac najpierw)\n")
    L.append("```")
    L.append("rank_score = " + " + ".join(f"{w:.2f}*{k}" for k, w in cfg.RANKING_WEIGHTS.items()))
    L.append("```")
    L.append("Skladniki (min-max po 54 uslugach):")
    L.append("- `expected_gain` — oczekiwany przyrost SRI,")
    L.append("- `energy_potential` — udzial kryteriow energetycznych (EE + elastycznosc),")
    L.append("- `ease` — latwosc wdrozenia (1 − udzial funkcji wymagajacych sprzetu fizycznego),")
    L.append("- `service_leverage` — liczba uslug wspoldzielacych funkcje,")
    L.append("- `domains` — liczba domen,")
    L.append("- `prereq_readiness` — plytkosc prerekwizytow (im mniej/nizej, tym wyzej),")
    L.append("- `criteria` — liczba Impact Criteria poprawianych przez usluge.\n")

    L.append("## 3. Pelny ranking 54 uslug\n")
    L.append("| # | Usluga | Nazwa | Domena | Priorytet | Rank score | Exp. Gain | Latwosc |")
    L.append("|---|---|---|---|---|---|---|---|")
    for code in ranked:
        r = recs[code]
        L.append(f"| {r['ranking']['rank']} | {code} | {r['name_pl']} | {r['domain_pl']} "
                 f"| {r['priority']['level']} | {r['ranking']['score']:.3f} "
                 f"| {r['expected_improvement']['total_expected_gain_percent']:.3f}% "
                 f"| {r['ranking']['factors']['ease']:.2f} |")
    L.append("")

    with open(os.path.join(OUTDIR, "SRI_PRIORITY_ENGINE.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def main():
    cfg, eng, cat, eg, recs, feat, ranked, pscore, rscore = build()
    prio_counts = write_outputs(cfg, eng, cat, eg, recs, feat, ranked)
    codes = sorted(recs.keys())

    print("=" * 70)
    print("SRI RECOMMENDATION ENGINE — RAPORT BUDOWY")
    print("=" * 70)

    print("\nWALIDACJA Expected Gain (suma udzialow ~ 100%):")
    for scope in list(eng.BUILDING_TYPES) + ["combined"]:
        s = sum(eg[scope][c]["total_percent"] for c in codes)
        ok = "OK" if abs(s - 100.0) < 0.5 else "!! ODchylenie"
        print(f"  - {scope:<16} suma = {s:7.3f}%  [{ok}]")

    print("\nROZKLAD PRIORYTETOW:")
    for k in ["Critical", "High", "Medium", "Low"]:
        print(f"  - {k:<9}: {prio_counts.get(k, 0)}")

    print("\nTOP 10 REKOMENDACJI (ranking — co wdrazac najpierw):")
    for code in ranked[:10]:
        r = recs[code]
        print(f"  #{r['ranking']['rank']:<2} {code:<7} {r['priority']['level']:<8} "
              f"rank={r['ranking']['score']:.3f}  gain={r['expected_improvement']['total_expected_gain_percent']:.2f}%  "
              f"{r['name_pl'][:38]}")

    print("\nTOP 5 wg Expected Gain (najwiekszy wplyw na wynik):")
    for code in sorted(codes, key=lambda c: -eg["combined"][c]["total_percent"])[:5]:
        print(f"  {code:<7} {eg['combined'][code]['total_percent']:.3f}%  {recs[code]['name_pl'][:44]}")

    print("\nGOTOWOSC: model rekomendacji + priorytet + ranking = TAK ✅")
    print("=" * 70)


if __name__ == "__main__":
    main()
