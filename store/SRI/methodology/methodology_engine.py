# -*- coding: utf-8 -*-
"""
Methodology Version Engine - silnik.

Odpowiedzialnosci:
  1. Zaladowac oficjalny katalog (docs/sri/catalogue) jako tresc wersji ROOT.
  2. Zmaterializowac dowolna wersje przez lancuch dziedziczenia + overlaye.
  3. Porownac dwie wersje i wygenerowac rekordy MethodologyDiff.
  4. Wygenerowac artefakty:
       docs/sri/methodology/METHODOLOGY_REGISTRY.json
       docs/sri/methodology/METHODOLOGY_DIFFS.json
       docs/sri/methodology/METHODOLOGY_VERSION_ENGINE.md
       docs/sri/methodology/METHODOLOGY_DIFF_MODEL.md
       docs/sri/methodology/CALCULATION_STRATEGY_MODEL.md
       docs/sri/methodology/VERSIONING_TEST_CASES.md

Silnik jest data-driven: dodanie nowej wersji nie wymaga zmian w tym pliku.
"""
import json
import sys
import copy
import hashlib
import uuid
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from methodology_data import CALCULATION_STRATEGIES, VERSIONS, DIFF_PAIRS  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
CATALOGUE = ROOT / "docs" / "sri" / "catalogue"
OUT = ROOT / "docs" / "sri" / "methodology"
OUT.mkdir(parents=True, exist_ok=True)

NS = uuid.UUID("6b3f8e7a-2c1d-4f5a-9b0e-methver00001".replace("methver00001", "0a1b2c3d4e5f"))

# Mapowanie: entity_type -> (domyslny impact_level, requires_manual_review)
IMPACT_RULES = {
    "service": ("high", True),
    "functionality_level": ("high", True),
    "impact_score": ("high", True),
    "weight_domain": ("medium", True),
    "weight_criterion": ("medium", True),
    "calculation_strategy": ("high", True),
    "audit_question": ("low", False),
    "recommendation": ("low", False),
    "report": ("low", False),
}


# ---------------------------------------------------------------------------
# Ladowanie oficjalnego katalogu jako tresci ROOT
# ---------------------------------------------------------------------------
def _load(name):
    return json.loads((CATALOGUE / name).read_text(encoding="utf-8"))


def load_manifest():
    return _load("import-manifest.json")


def build_root_content():
    """Zwraca pelna, plaska tresc metodologii bazowej z katalogu."""
    services_raw = _load("services-authoritative.json")["services"]
    scores_raw = _load("impact-scores.json")["scores_by_service"]
    dw = _load("weights/domain-impact-weights.json")["weights"]
    cw = _load("weights/impact-criterion-weights.json")["weights"]

    services = {}
    fl_levels = {}
    for s in services_raw:
        code = s["official_code"]
        services[code] = {
            "domain": s["domain_code"],
            "fl_max": int(s["fl_max"]),
            "name": s.get("official_name_en", code),
        }
        fl_levels[code] = sorted(int(fl["level"]) for fl in s.get("functionality_levels", []))

    impact_scores = {}
    for code, rows in scores_raw.items():
        for row in rows:
            lvl = int(row["level"])
            for ic, val in row["scores"].items():
                impact_scores[(code, lvl, ic)] = float(val)

    weights_domain = {}
    for w in dw:
        key = (w["building_type"], w["climate_zone"], w["domain_code"], w["impact_criterion_code"])
        weights_domain[key] = float(w["weight"])

    weights_criterion = {}
    for w in cw:
        key = (w["building_type"], w["impact_criterion_code"])
        weights_criterion[key] = float(w["weight"])

    return {
        "calculation_strategy": "iso52120_weighted_renormalized",
        "services": services,
        "fl_levels": fl_levels,
        "impact_scores": impact_scores,
        "weights_domain": weights_domain,
        "weights_criterion": weights_criterion,
        "audit_questions": {},
        "recommendations": {"version": "1.0", "engine": "SRI_RECOMMENDATION_GRAPH"},
        "reports": {"version": "1.0", "set": ["SRI_VALIDATION_REPORT", "SRI_OPTIMIZATION_TEST_CASES"]},
    }


# ---------------------------------------------------------------------------
# Materializacja wersji przez lancuch dziedziczenia + overlay
# ---------------------------------------------------------------------------
_BY_ID = {v["id"]: v for v in VERSIONS}
_CACHE = {}


def apply_overlay(content, overlay):
    if not overlay:
        return content
    c = content

    for item in overlay.get("weights_domain", []):
        key = (item["building_type"], item["climate_zone"], item["domain"], item["impact_criterion"])
        c["weights_domain"][key] = float(item["new_weight"])

    for item in overlay.get("weights_criterion", []):
        key = (item["building_type"], item["impact_criterion"])
        c["weights_criterion"][key] = float(item["new_weight"])

    for item in overlay.get("impact_scores", []):
        key = (item["service"], int(item["level"]), item["impact_criterion"])
        c["impact_scores"][key] = float(item["new_score"])

    svc = overlay.get("services", {})
    for add in svc.get("add", []):
        c["services"][add["code"]] = {
            "domain": add["domain"], "fl_max": int(add["fl_max"]), "name": add.get("name", add["code"]),
        }
        c["fl_levels"].setdefault(add["code"], list(range(0, int(add["fl_max"]) + 1)))
    for code in svc.get("remove", []):
        c["services"].pop(code, None)
        c["fl_levels"].pop(code, None)
    for mod in svc.get("modify", []):
        code = mod["code"]
        if code in c["services"]:
            if mod["field"] == "fl_max":
                c["services"][code]["fl_max"] = int(mod["new_value"])
                c["fl_levels"][code] = list(range(0, int(mod["new_value"]) + 1))
            else:
                c["services"][code][mod["field"]] = mod["new_value"]

    aq = overlay.get("audit_questions", {})
    for add in aq.get("add", []):
        c["audit_questions"][add["id"]] = {k: v for k, v in add.items() if k != "id"}
    for qid in aq.get("remove", []):
        c["audit_questions"].pop(qid, None)

    if "calculation_strategy" in overlay:
        c["calculation_strategy"] = overlay["calculation_strategy"]

    if "recommendations" in overlay:
        c["recommendations"] = overlay["recommendations"]
    if "reports" in overlay:
        c["reports"] = overlay["reports"]

    return c


def materialize(version_id):
    if version_id in _CACHE:
        return copy.deepcopy(_CACHE[version_id])
    v = _BY_ID[version_id]
    if v["inherits_from"] is None:
        content = build_root_content()
    else:
        content = materialize(v["inherits_from"])
    content = apply_overlay(content, v.get("overlay"))
    _CACHE[version_id] = copy.deepcopy(content)
    return copy.deepcopy(content)


def overlay_source_type(version_id):
    ov = _BY_ID[version_id].get("overlay") or {}
    return ov.get("source_type_default", "official_methodology")


# ---------------------------------------------------------------------------
# Diff engine -> MethodologyDiff
# ---------------------------------------------------------------------------
def _fmt(v):
    if isinstance(v, float):
        return round(v, 6)
    return v


def diff_versions(base_id, compared_id):
    a = materialize(base_id)
    b = materialize(compared_id)
    src_type = overlay_source_type(compared_id)
    diffs = []

    def add(change_type, entity_type, entity_id, old, new, note=None):
        lvl, manual = IMPACT_RULES[entity_type]
        # wagi: podnies impact do high przy zmianie wzglednej > 20%
        if entity_type in ("weight_domain", "weight_criterion") and change_type == "modified":
            try:
                if old and abs((new - old) / old) > 0.20:
                    lvl = "high"
            except (TypeError, ZeroDivisionError):
                pass
        rec = {
            "id": str(uuid.uuid5(NS, f"{base_id}|{compared_id}|{entity_type}|{entity_id}|{change_type}")),
            "base_version_id": base_id,
            "compared_version_id": compared_id,
            "change_type": change_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_value": _fmt(old),
            "new_value": _fmt(new),
            "impact_level": lvl,
            "requires_manual_review": manual,
            "source_type": src_type,
        }
        if note:
            rec["note"] = note
        diffs.append(rec)

    # calculation_strategy
    if a["calculation_strategy"] != b["calculation_strategy"]:
        add("modified", "calculation_strategy", "calculation_strategy",
            a["calculation_strategy"], b["calculation_strategy"])

    # services
    for code in sorted(set(b["services"]) - set(a["services"])):
        add("added", "service", code, None, b["services"][code])
    for code in sorted(set(a["services"]) - set(b["services"])):
        add("removed", "service", code, a["services"][code], None)
    for code in sorted(set(a["services"]) & set(b["services"])):
        sa, sb = a["services"][code], b["services"][code]
        if sa.get("fl_max") != sb.get("fl_max"):
            add("modified", "functionality_level", f"{code}.fl_max", sa.get("fl_max"), sb.get("fl_max"))
        if sa.get("domain") != sb.get("domain"):
            add("modified", "service", f"{code}.domain", sa.get("domain"), sb.get("domain"))

    # impact_scores
    for key in sorted(set(b["impact_scores"]) - set(a["impact_scores"]), key=lambda k: (k[0], k[1], k[2])):
        add("added", "impact_score", f"{key[0]}|L{key[1]}|{key[2]}", None, b["impact_scores"][key])
    for key in sorted(set(a["impact_scores"]) - set(b["impact_scores"]), key=lambda k: (k[0], k[1], k[2])):
        add("removed", "impact_score", f"{key[0]}|L{key[1]}|{key[2]}", a["impact_scores"][key], None)
    for key in sorted(set(a["impact_scores"]) & set(b["impact_scores"]), key=lambda k: (k[0], k[1], k[2])):
        if abs(a["impact_scores"][key] - b["impact_scores"][key]) > 1e-9:
            add("modified", "impact_score", f"{key[0]}|L{key[1]}|{key[2]}",
                a["impact_scores"][key], b["impact_scores"][key])

    # weights_domain
    for key in sorted(set(a["weights_domain"]) & set(b["weights_domain"])):
        if abs(a["weights_domain"][key] - b["weights_domain"][key]) > 1e-9:
            add("modified", "weight_domain", "|".join(key), a["weights_domain"][key], b["weights_domain"][key])
    for key in sorted(set(b["weights_domain"]) - set(a["weights_domain"])):
        add("added", "weight_domain", "|".join(key), None, b["weights_domain"][key])
    for key in sorted(set(a["weights_domain"]) - set(b["weights_domain"])):
        add("removed", "weight_domain", "|".join(key), a["weights_domain"][key], None)

    # weights_criterion
    for key in sorted(set(a["weights_criterion"]) & set(b["weights_criterion"])):
        if abs(a["weights_criterion"][key] - b["weights_criterion"][key]) > 1e-9:
            add("modified", "weight_criterion", "|".join(key),
                a["weights_criterion"][key], b["weights_criterion"][key])

    # audit_questions
    for qid in sorted(set(b["audit_questions"]) - set(a["audit_questions"])):
        add("added", "audit_question", qid, None, b["audit_questions"][qid])
    for qid in sorted(set(a["audit_questions"]) - set(b["audit_questions"])):
        add("removed", "audit_question", qid, a["audit_questions"][qid], None)

    # recommendations / reports (po wersji)
    if a["recommendations"] != b["recommendations"]:
        add("modified", "recommendation", "recommendations",
            a["recommendations"].get("version"), b["recommendations"].get("version"))
    if a["reports"] != b["reports"]:
        add("modified", "report", "reports",
            a["reports"].get("version"), b["reports"].get("version"))

    return diffs


def summarize(diffs):
    by_entity, by_change, by_impact = {}, {}, {}
    manual = 0
    for d in diffs:
        by_entity[d["entity_type"]] = by_entity.get(d["entity_type"], 0) + 1
        by_change[d["change_type"]] = by_change.get(d["change_type"], 0) + 1
        by_impact[d["impact_level"]] = by_impact.get(d["impact_level"], 0) + 1
        if d["requires_manual_review"]:
            manual += 1
    return {"total": len(diffs), "by_entity": by_entity, "by_change": by_change,
            "by_impact": by_impact, "requires_manual_review": manual}


# ---------------------------------------------------------------------------
# Artefakty
# ---------------------------------------------------------------------------
def build_registry():
    manifest = load_manifest()
    versions = []
    for v in VERSIONS:
        rec = {k: v[k] for k in (
            "id", "methodology_type", "name", "country", "version", "valid_from",
            "valid_to", "status", "calculation_strategy", "source_document",
            "source_checksum", "import_date", "importer_version", "inherits_from",
            "migration_notes")}
        if v["inherits_from"] is None:
            rec["source_checksum"] = manifest["source_checksum"]
            rec["import_date"] = manifest["import_date"]
            rec["importer_version"] = manifest["importer_version"]
        content = materialize(v["id"])
        rec["content_stats"] = {
            "services": len(content["services"]),
            "impact_scores": len(content["impact_scores"]),
            "weights_domain": len(content["weights_domain"]),
            "weights_criterion": len(content["weights_criterion"]),
            "audit_questions": len(content["audit_questions"]),
        }
        rec["content_checksum"] = content_checksum(content)
        versions.append(rec)
    return {
        "generated_from": "store/sri/methodology/methodology_engine.py",
        "root_source_checksum": manifest["source_checksum"],
        "calculation_strategies": CALCULATION_STRATEGIES,
        "versions": versions,
    }


def content_checksum(content):
    payload = {
        "calculation_strategy": content["calculation_strategy"],
        "services": {k: content["services"][k] for k in sorted(content["services"])},
        "impact_scores": {f"{k[0]}|{k[1]}|{k[2]}": content["impact_scores"][k]
                          for k in sorted(content["impact_scores"])},
        "weights_domain": {"|".join(k): content["weights_domain"][k]
                           for k in sorted(content["weights_domain"])},
        "weights_criterion": {"|".join(k): content["weights_criterion"][k]
                              for k in sorted(content["weights_criterion"])},
        "audit_questions": sorted(content["audit_questions"]),
    }
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def _json_default(o):
    if isinstance(o, (set, tuple)):
        return list(o)
    return str(o)


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=_json_default), encoding="utf-8")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    registry = build_registry()
    write_json(OUT / "METHODOLOGY_REGISTRY.json", registry)

    all_diffs = []
    diff_index = []
    for pair in DIFF_PAIRS:
        diffs = diff_versions(pair["base"], pair["compared"])
        summary = summarize(diffs)
        all_diffs.append({"pair": pair, "summary": summary, "diffs": diffs})
        diff_index.append({"scenario": pair["scenario"], "base": pair["base"],
                           "compared": pair["compared"], "summary": summary})

    write_json(OUT / "METHODOLOGY_DIFFS.json", {"diffs": all_diffs})

    from methodology_docs import write_all_docs
    write_all_docs(OUT, registry, all_diffs)

    # konsola
    print("=" * 70)
    print("METHODOLOGY VERSION ENGINE - podsumowanie")
    print("=" * 70)
    print(f"Strategie liczenia: {len(CALCULATION_STRATEGIES)}")
    print(f"Wersje metodologii: {len(VERSIONS)}")
    for v in registry["versions"]:
        inh = v["inherits_from"] or "-"
        print(f"  - {v['id']:<14} ({v['country']}) strat={v['calculation_strategy']:<32} "
              f"inherits={inh:<12} services={v['content_stats']['services']} "
              f"aq={v['content_stats']['audit_questions']}")
    print("-" * 70)
    for item in all_diffs:
        p, s = item["pair"], item["summary"]
        print(f"\n{p['scenario']}")
        print(f"  {p['base']} -> {p['compared']}: {s['total']} zmian, "
              f"do recznej weryfikacji: {s['requires_manual_review']}")
        print(f"  wg encji: {s['by_entity']}")
        print(f"  wg zmiany: {s['by_change']}  wg wagi: {s['by_impact']}")
    print("\nArtefakty zapisane w docs/sri/methodology/")


if __name__ == "__main__":
    main()
