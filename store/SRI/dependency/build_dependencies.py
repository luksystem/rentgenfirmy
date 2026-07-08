# -*- coding: utf-8 -*-
"""SRI Dependency Engine — builder.

Laczy oficjalny katalog uslug/FL (docs/sri/catalogue) z warstwa zaleznosci
(dependency_data.py) i generuje:

  docs/sri/dependency/SRI_CAPABILITIES_CATALOG.json
  docs/sri/dependency/SRI_DEPENDENCY_GRAPH.json
  docs/sri/dependency/SRI_DEPENDENCY_MODEL.md
  docs/sri/dependency/SRI_BLOCKING_CONDITIONS.md
  docs/sri/dependency/SRI_AUDIT_INPUT_REQUIREMENTS.md

Nie zmienia punktacji SRI. Warstwa pomocnicza (advisory).
Uruchomienie: python store/sri/dependency/build_dependencies.py
"""

import hashlib
import importlib.util
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CATALOGUE = os.path.join(ROOT, "docs", "sri", "catalogue")
OUTDIR = os.path.join(ROOT, "docs", "sri", "dependency")
ENGINE_VERSION = "1.0.0"
# 'manual' = wymaga ogledzin/zdjecia/dokumentu (obecnosc fizyczna urzadzenia).
# 'assisted' = dane z BMS + potwierdzenie audytora. 'automatic' = potwierdzalne z danych.
MODES_MANUAL = {"manual"}
MODES_ASSISTED = {"assisted"}

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


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_catalogue():
    with open(os.path.join(CATALOGUE, "services-authoritative.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    services = {}
    for s in data["services"]:
        services[s["official_code"]] = {
            "code": s["official_code"],
            "domain": s["domain_code"],
            "name_en": s.get("official_name_en"),
            "name_pl": s.get("official_name_pl"),
            "fl_max": s["fl_max"],
            "levels": {lv["level"]: lv.get("official_description_en", "")
                       for lv in s.get("functionality_levels", [])},
        }
    return services


def sha256_str(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build():
    dd = load_module(os.path.join(os.path.dirname(__file__), "dependency_data.py"), "dependency_data")
    caps = dd.CAPABILITIES
    service_deps = dd.SERVICE_DEPS
    cross = dd.CROSS_DOMAIN
    src_map = dd.SRC
    services = load_catalogue()

    errors = []
    warnings = []

    # ── Walidacja spojnosci ──────────────────────────────────────────────────
    for code in services:
        if code not in service_deps:
            errors.append(f"Brak zaleznosci dla uslugi {code}")
    for code in service_deps:
        if code not in services:
            errors.append(f"Zaleznosci dla nieistniejacej uslugi {code}")

    for code, rows in service_deps.items():
        fl_max = services.get(code, {}).get("fl_max", 0)
        seen = defaultdict(list)
        for cap_id, lvl, sc in rows:
            if cap_id not in caps:
                errors.append(f"{code}: nieznana capability '{cap_id}'")
            if sc not in src_map:
                errors.append(f"{code}: nieznany source_code '{sc}' dla {cap_id}")
            if lvl < 1 or lvl > fl_max:
                errors.append(f"{code}: poziom {lvl} poza zakresem 1..{fl_max} ({cap_id})")
            seen[cap_id].append(lvl)
        for cap_id, lvls in seen.items():
            if len(lvls) > 1:
                warnings.append(f"{code}: capability '{cap_id}' wystepuje wielokrotnie -> uzyto min_level={min(lvls)}")

    # ── Budowa grafu per usluga ──────────────────────────────────────────────
    graph_services = {}
    total_edges = 0
    manual_edges = 0
    assisted_edges = 0
    cap_to_services = defaultdict(set)   # capability -> uslugi (odwrotny indeks)
    cap_to_domains = defaultdict(set)

    for code, meta in sorted(services.items()):
        rows = service_deps[code]
        # deduplikacja: min_level dla kazdej capability
        cap_min = {}
        cap_src = {}
        for cap_id, lvl, sc in rows:
            if cap_id not in cap_min or lvl < cap_min[cap_id]:
                cap_min[cap_id] = lvl
                cap_src[cap_id] = src_map[sc]
            elif lvl == cap_min[cap_id] and src_map[sc] == "official_methodology":
                cap_src[cap_id] = "official_methodology"

        required = []
        for cap_id, lvl in sorted(cap_min.items(), key=lambda kv: (kv[1], kv[0])):
            required.append({
                "capability": cap_id,
                "min_level": lvl,
                "source_type": cap_src[cap_id],
                "needs_manual_verification": caps[cap_id]["verification_mode"] in MODES_MANUAL,
            })
            cap_to_services[cap_id].add(code)
            cap_to_domains[cap_id].add(meta["domain"])
            total_edges += 1
            if caps[cap_id]["verification_mode"] in MODES_MANUAL:
                manual_edges += 1
            elif caps[cap_id]["verification_mode"] in MODES_ASSISTED:
                assisted_edges += 1

        # prerekwizyty per FL (kumulatywnie)
        fl_prereq = {}
        for lvl in range(1, meta["fl_max"] + 1):
            fl_prereq[str(lvl)] = sorted([c for c, ml in cap_min.items() if ml <= lvl])

        # warunki blokujace: brak capability blokuje osiagniecie min_level i wyzej
        blocking = []
        for cap_id, lvl in sorted(cap_min.items(), key=lambda kv: (kv[1], kv[0])):
            if lvl <= meta["fl_max"]:
                blocking.append({
                    "missing_capability": cap_id,
                    "blocks_from_level": lvl,
                    "max_reachable_without": lvl - 1,
                    "source_type": cap_src[cap_id],
                })

        graph_services[code] = {
            "code": code,
            "domain": meta["domain"],
            "name_en": meta["name_en"],
            "name_pl": meta["name_pl"],
            "fl_max": meta["fl_max"],
            "required_capabilities": required,
            "fl_prerequisites": fl_prereq,
            "blocking_conditions": blocking,
        }

    # ── Odwrotny indeks: capability -> uslugi/domeny ─────────────────────────
    capability_impact = {}
    for cap_id in caps:
        svc = sorted(cap_to_services.get(cap_id, []))
        dom = sorted(cap_to_domains.get(cap_id, []))
        capability_impact[cap_id] = {
            "services": svc,
            "service_count": len(svc),
            "domains": dom,
            "domain_count": len(dom),
            "cross_domain": len(dom) > 1,
        }

    # ── Zapis JSON ───────────────────────────────────────────────────────────
    os.makedirs(OUTDIR, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()

    cap_catalog = {
        "meta": {
            "engine": "SRI Dependency Engine",
            "engine_version": ENGINE_VERSION,
            "generated_at": generated_at,
            "role": "advisory_layer",
            "note": "Warstwa pomocnicza nad oficjalna metodologia SRI. Nie zmienia punktacji.",
            "capability_count": len(caps),
        },
        "capabilities": {
            cap_id: {
                "id": cap_id,
                "name_pl": c["name_pl"],
                "category": c["category"],
                "description": c["description"],
                "evidence": c["evidence"],
                "verification": c["verification"],
                "verification_mode": c["verification_mode"],
                "needs_manual_verification": c["verification_mode"] in MODES_MANUAL,
                "impact": capability_impact[cap_id],
            }
            for cap_id, c in sorted(caps.items())
        },
    }
    with open(os.path.join(OUTDIR, "SRI_CAPABILITIES_CATALOG.json"), "w", encoding="utf-8") as fh:
        json.dump(cap_catalog, fh, ensure_ascii=False, indent=2)

    graph = {
        "meta": {
            "engine": "SRI Dependency Engine",
            "engine_version": ENGINE_VERSION,
            "generated_at": generated_at,
            "role": "advisory_layer",
            "service_count": len(graph_services),
            "capability_count": len(caps),
            "dependency_edges": total_edges,
            "source_catalogue": "docs/sri/catalogue/services-authoritative.json",
        },
        "services": graph_services,
        "cross_domain": cross,
        "capability_impact": capability_impact,
    }
    graph["meta"]["content_checksum"] = sha256_str(
        json.dumps(graph["services"], ensure_ascii=False, sort_keys=True)
    )
    with open(os.path.join(OUTDIR, "SRI_DEPENDENCY_GRAPH.json"), "w", encoding="utf-8") as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)

    # ── Statystyki ───────────────────────────────────────────────────────────
    src_counts = defaultdict(int)
    for s in graph_services.values():
        for r in s["required_capabilities"]:
            src_counts[r["source_type"]] += 1
    multi_service_caps = {c: v for c, v in capability_impact.items() if v["service_count"] > 1}
    cross_domain_caps = {c: v for c, v in capability_impact.items() if v["cross_domain"]}

    stats = {
        "capabilities": len(caps),
        "services": len(graph_services),
        "dependency_edges": total_edges,
        "official_methodology": src_counts["official_methodology"],
        "engineering_assumption": src_counts["engineering_assumption"],
        "manual_verification_edges": manual_edges,
        "assisted_verification_edges": assisted_edges,
        "multi_service_capabilities": len(multi_service_caps),
        "cross_domain_capabilities": len(cross_domain_caps),
    }

    # ── Dokumenty MD ─────────────────────────────────────────────────────────
    write_model_md(caps, graph_services, cross, capability_impact, stats, generated_at)
    write_blocking_md(caps, graph_services, capability_impact, generated_at)
    write_audit_md(caps, capability_impact, cross, generated_at)

    return caps, graph_services, capability_impact, stats, errors, warnings, multi_service_caps


def _domain_label(code):
    return DOMAIN_PL.get(code, code)


def write_model_md(caps, gsvc, cross, impact, stats, generated_at):
    L = []
    L.append("# SRI Dependency Model\n")
    L.append("> Warstwa **pomocnicza (advisory)** nad oficjalna metodologia SRI. "
             "Nie zmienia punktacji ani listy uslug. Sluzy do odpowiedzi: co jest wymagane, "
             "aby osiagnac dany Functionality Level, co blokuje wyzszy poziom oraz jakie dane zebrac w audycie.\n")
    L.append(f"- Wygenerowano: `{generated_at}`")
    L.append(f"- Wersja silnika zaleznosci: `{ENGINE_VERSION}`")
    L.append(f"- Zdefiniowanych capability: **{stats['capabilities']}**")
    L.append(f"- Uslug SRI objetych modelem: **{stats['services']} / 54**")
    L.append(f"- Przypisanych zaleznosci (capability→usluga): **{stats['dependency_edges']}**")
    L.append(f"  - z metodologii (`official_methodology`): **{stats['official_methodology']}**")
    L.append(f"  - zalozenia inzynierskie (`engineering_assumption`): **{stats['engineering_assumption']}**")
    L.append(f"- Zaleznosci wymagajacych recznej weryfikacji (obecnosc fizyczna): **{stats['manual_verification_edges']}**")
    L.append(f"- Zaleznosci weryfikowanych wspomaganie (dane + audytor): **{stats['assisted_verification_edges']}**\n")

    L.append("## Model danych\n")
    L.append("Kazda zaleznosc = powiazanie **capability → usluga** z polami:\n")
    L.append("- `min_level` — najnizszy Functionality Level, od ktorego capability jest wymagana,")
    L.append("- `source_type` — `official_methodology` (wynika z opisu FL) lub `engineering_assumption` (praktyczna zaleznosc techniczna),")
    L.append("- `needs_manual_verification` — czy potwierdzenie wymaga czlowieka (zdjecie/dokument/ogledziny).\n")
    L.append("**Regula prerekwizytow:** capability z `min_level = n` jest wymagana dla FL ≥ n (kumulatywnie).")
    L.append("**Regula blokady:** brak capability z `min_level = n` ogranicza usluge do maks. FL = n-1.\n")

    L.append("## Kategorie capability\n")
    by_cat = defaultdict(list)
    for cid, c in sorted(caps.items()):
        by_cat[c["category"]].append((cid, c))
    for cat in sorted(by_cat):
        L.append(f"### {cat}\n")
        L.append("| Capability | Nazwa | Uslug | Domen | Weryfikacja |")
        L.append("|---|---|---|---|---|")
        for cid, c in by_cat[cat]:
            im = impact[cid]
            L.append(f"| `{cid}` | {c['name_pl']} | {im['service_count']} | {im['domain_count']} | {c['verification_mode']} |")
        L.append("")

    L.append("## Zaleznosci per usluga\n")
    cur_dom = None
    for code, s in sorted(gsvc.items(), key=lambda kv: (kv[1]["domain"], kv[0])):
        if s["domain"] != cur_dom:
            cur_dom = s["domain"]
            L.append(f"### {_domain_label(cur_dom)} (`{cur_dom}`)\n")
        L.append(f"#### {code} — {s['name_pl'] or s['name_en']} (FLmax {s['fl_max']})\n")
        L.append("| Capability | min FL | source_type | ręczna wer. |")
        L.append("|---|---|---|---|")
        for r in s["required_capabilities"]:
            mv = "tak" if r["needs_manual_verification"] else "nie"
            L.append(f"| `{r['capability']}` | {r['min_level']} | {r['source_type']} | {mv} |")
        prereq = "; ".join(f"FL{lv}: {', '.join(v) if v else '—'}" for lv, v in s["fl_prerequisites"].items())
        L.append(f"\n_Prerekwizyty:_ {prereq}\n")

    L.append("## Zaleznosci miedzydomenowe (funkcje wspolne)\n")
    L.append("| Czynnik | Capability | source_type | Domeny |")
    L.append("|---|---|---|---|")
    for x in cross:
        doms = ", ".join(_domain_label(d) for d in x["affected_domains"])
        L.append(f"| {x['factor_pl']} | `{x['capability']}` | {x['source_type']} | {doms} |")
    L.append("")
    for x in cross:
        L.append(f"- **{x['factor_pl']}**: {x['description']}")
    L.append("")

    with open(os.path.join(OUTDIR, "SRI_DEPENDENCY_MODEL.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_blocking_md(caps, gsvc, impact, generated_at):
    L = []
    L.append("# SRI Blocking Conditions\n")
    L.append("> Czego brak **ogranicza pulap Functionality Level**. "
             "Wynika bezposrednio z modelu zaleznosci (advisory).\n")
    L.append(f"- Wygenerowano: `{generated_at}`\n")

    L.append("## Blokady per usluga\n")
    L.append("| Usluga | Brakujaca capability | Blokuje od FL | Maks. FL bez niej | source_type |")
    L.append("|---|---|---|---|---|")
    for code, s in sorted(gsvc.items(), key=lambda kv: (kv[1]["domain"], kv[0])):
        for b in s["blocking_conditions"]:
            L.append(f"| {code} | `{b['missing_capability']}` ({caps[b['missing_capability']]['name_pl']}) "
                     f"| {b['blocks_from_level']} | {b['max_reachable_without']} | {b['source_type']} |")
    L.append("")

    L.append("## Braki wplywajace na wiele uslug (efekt dzwigni)\n")
    L.append("> Uzupelnienie tych funkcji podnosi pulap w wielu uslugach naraz — priorytet dla rekomendacji.\n")
    L.append("| Capability | Nazwa | Uslug | Domen | Uslugi |")
    L.append("|---|---|---|---|---|")
    multi = sorted(
        ((cid, impact[cid]) for cid in caps if impact[cid]["service_count"] > 1),
        key=lambda kv: (-kv[1]["service_count"], kv[0]),
    )
    for cid, im in multi:
        svc = ", ".join(im["services"])
        L.append(f"| `{cid}` | {caps[cid]['name_pl']} | {im['service_count']} | {im['domain_count']} | {svc} |")
    L.append("")

    with open(os.path.join(OUTDIR, "SRI_BLOCKING_CONDITIONS.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def write_audit_md(caps, impact, cross, generated_at):
    L = []
    L.append("# SRI Audit Input Requirements\n")
    L.append("> Jakie dane i dowody nalezy zebrac w audycie, aby potwierdzic zaleznosci. "
             "To jeszcze **nie** sa pytania audytowe — to katalog wymaganych danych wejsciowych.\n")
    L.append(f"- Wygenerowano: `{generated_at}`\n")

    L.append("## Tryby weryfikacji\n")
    L.append("- `automatic` — system moze potwierdzic z danych BMS/platformy,")
    L.append("- `assisted` — dane + potwierdzenie audytora,")
    L.append("- `manual` — obecnosc fizyczna / zdjecie / dokument (ogledziny).\n")
    L.append("Jesli brak danych wejsciowych lub dowodu — wynik oznaczyc jako `needs_verification` "
             "(`uncertain`), a nie zakladac spelnienia.\n")

    L.append("## Wymagane dane wejsciowe per capability\n")
    by_cat = defaultdict(list)
    for cid, c in sorted(caps.items()):
        by_cat[c["category"]].append((cid, c))
    for cat in sorted(by_cat):
        L.append(f"### {cat}\n")
        for cid, c in by_cat[cat]:
            im = impact[cid]
            L.append(f"#### `{cid}` — {c['name_pl']}\n")
            L.append(f"- Dotyczy uslug: **{im['service_count']}** ({', '.join(im['services']) or '—'})")
            L.append(f"- Tryb weryfikacji: **{c['verification_mode']}**"
                     + ("  ⚠ wymaga recznej weryfikacji" if c["verification_mode"] in MODES_MANUAL else ""))
            L.append(f"- Dowody: {', '.join(c['evidence'])}")
            L.append(f"- Logika weryfikacji: {c['verification']}")
            L.append(f"- Oznacz `needs_verification`, gdy: brak dowodu lub dane niespojne/przestarzale.\n")

    L.append("## Minimalny zestaw danych miedzydomenowych\n")
    L.append("> Zebranie tych funkcji raz obsluguje wiele domen jednoczesnie.\n")
    L.append("| Czynnik | Capability | Domeny |")
    L.append("|---|---|---|")
    for x in cross:
        doms = ", ".join(_domain_label(d) for d in x["affected_domains"])
        L.append(f"| {x['factor_pl']} | `{x['capability']}` | {doms} |")
    L.append("")

    with open(os.path.join(OUTDIR, "SRI_AUDIT_INPUT_REQUIREMENTS.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))


def main():
    caps, gsvc, impact, stats, errors, warnings, multi = build()

    print("=" * 70)
    print("SRI DEPENDENCY ENGINE — RAPORT BUDOWY")
    print("=" * 70)
    if warnings:
        print(f"\nOstrzezenia ({len(warnings)}):")
        for w in warnings:
            print(f"  ! {w}")
    if errors:
        print(f"\nBLEDY ({len(errors)}):")
        for e in errors:
            print(f"  X {e}")
    else:
        print("\nWalidacja spojnosci: OK (brak bledow)")

    print("\nSTATYSTYKI")
    print(f"  - Zdefiniowanych capability:            {stats['capabilities']}")
    print(f"  - Uslug objetych modelem:               {stats['services']} / 54")
    print(f"  - Przypisanych zaleznosci:              {stats['dependency_edges']}")
    print(f"      * official_methodology:             {stats['official_methodology']}")
    print(f"      * engineering_assumption:           {stats['engineering_assumption']}")
    print(f"  - Zaleznosci do recznej weryfikacji:    {stats['manual_verification_edges']} (obecnosc fizyczna)")
    print(f"  - Zaleznosci weryf. wspomaganej:        {stats['assisted_verification_edges']} (dane + audytor)")
    print(f"  - Capability wplyw. na >1 usluge:       {stats['multi_service_capabilities']}")
    print(f"  - Capability miedzydomenowych (>1 dom): {stats['cross_domain_capabilities']}")

    print("\nCAPABILITY WYMAGAJACE RECZNEJ WERYFIKACJI (manual — obecnosc fizyczna):")
    manual_caps = sorted(cid for cid, c in caps.items() if c["verification_mode"] in MODES_MANUAL)
    print(f"  ({len(manual_caps)}): " + ", ".join(manual_caps))

    print("\nTOP capability wg liczby uslug (efekt dzwigni):")
    top = sorted(multi.items(), key=lambda kv: -kv[1]["service_count"])[:10]
    for cid, im in top:
        print(f"  - {cid:<32} {im['service_count']:>2} uslug, {im['domain_count']} domen")

    ready = not errors and stats["services"] == 54
    print("\nGOTOWOSC POD RECOMMENDATION ENGINE: " + ("TAK ✅" if ready else "NIE ❌"))
    print("=" * 70)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
