# -*- coding: utf-8 -*-
"""Final Core Validation - agreguje wszystkie kontrole fundamentu.

Sprawdza:
  1. Schematy JSON laduja sie i walidacja dziala (envelope + kontrakty frozen).
  2. Wszystkie opublikowane koperty (generated/<version>/**) maja poprawny payload_checksum
     i przechodza schemat artifact-envelope.
  3. Macierz zgodnosci i manifest seeda sa poprawne wzgledem swoich schematow.
  4. Kontrakty ZAMROZONE dzialaja z realnym silnikiem:
       - AssessmentInput (przyklad) waliduje sie schematem,
       - wynik compute_sri mapuje sie na CalculationResult i waliduje sie schematem.
  5. Determinizm silnika (te same wejscia -> ten sam wynik).

Wynik: raport + zapis generated/FINAL_CORE_VALIDATION.json. Kod wyjscia != 0 przy bledach.
"""
import json
import os
import sys

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "engine")))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SCHEMA_DIR = os.path.join(ROOT, "schemas")
GENERATED_ROOT = os.path.join(ROOT, "generated")
VERSION_ID = "eu-sri-v4.5"

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from jsonschema_mini import SchemaValidator
from provenance import verify_envelope, CORE_ENGINE_VERSION
import sri_engine
from scenarios import SCENARIOS


def to_calculation_result(res):
    """Mapuje wynik compute_sri na kontrakt ZAMROZONY CalculationResult."""
    per_domain = {}
    for (d, ic), a in res["achieved"].items():
        per_domain.setdefault(d, {})[ic] = {"achieved": a, "maxposs": res["maxposs"][(d, ic)]}
    per_service = {s["code"]: {"fl": s["level"], "fl_max": s["fl_max"]} for s in res["service_trace"]}
    return {
        "methodology_version_id": VERSION_ID,
        "engine_version": CORE_ENGINE_VERSION,
        "total_score_percent": round(res["sri_percent"], 4),
        "class": {"label": res["class_label"] or "?", "number": res["class_number"] or 0},
        "per_domain": per_domain,
        "per_criterion": {ic: res["sr_ic"][ic] for ic in res["sr_ic"]},
        "per_service": per_service,
        "warnings": [],
    }


def run():
    v = SchemaValidator(SCHEMA_DIR)
    checks = []

    def check(name, passed, detail=""):
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    # 1. schematy dzialaja
    try:
        sample_env = {"provenance": {
            "artifact_type": "artifact_index", "methodology_version_id": "x",
            "schema_version": "1.0.0", "engine_version": "1.0.0",
            "generated_by": "test", "generated_at": "2026-01-01T00:00:00Z",
            "source_checksum": None, "payload_checksum": "0" * 64,
        }, "payload": {}}
        errs = v.validate_file("artifact-envelope.schema.json", sample_env)
        check("Schemat envelope waliduje poprawna koperte", not errs, "; ".join(errs))
        bad = {"provenance": {"artifact_type": "NIE_ISTNIEJE"}, "payload": {}}
        errs_bad = v.validate_file("artifact-envelope.schema.json", bad)
        check("Schemat envelope odrzuca bledna koperte", len(errs_bad) > 0, f"{len(errs_bad)} bledow")
    except Exception as e:
        check("Schematy laduja sie", False, repr(e))

    # 2. integralnosc opublikowanych kopert
    vdir = os.path.join(GENERATED_ROOT, VERSION_ID)
    env_errors = []
    env_count = 0
    if os.path.isdir(vdir):
        for dirpath, _, files in os.walk(vdir):
            for fn in files:
                if not fn.endswith(".json"):
                    continue
                p = os.path.join(dirpath, fn)
                with open(p, encoding="utf-8") as f:
                    env = json.load(f)
                env_count += 1
                e1 = verify_envelope(env)
                e2 = v.validate_file("artifact-envelope.schema.json", env)
                for e in (e1 + e2):
                    env_errors.append(f"{os.path.relpath(p, GENERATED_ROOT)}: {e}")
    check(f"Integralnosc {env_count} opublikowanych kopert (checksum+schemat)",
          env_count > 0 and not env_errors, "; ".join(env_errors[:5]))

    # 3. macierz zgodnosci + seed manifest
    cm_path = os.path.join(GENERATED_ROOT, "compatibility-matrix.json")
    if os.path.exists(cm_path):
        with open(cm_path, encoding="utf-8") as f:
            cm = json.load(f)
        errs = v.validate_file("compatibility-matrix.schema.json", cm) + verify_envelope(cm)
        check("Macierz zgodnosci zgodna ze schematem", not errs, "; ".join(errs[:5]))
    else:
        check("Macierz zgodnosci istnieje", False, "brak compatibility-matrix.json")

    sm_path = os.path.join(vdir, "seed-manifest.json")
    if os.path.exists(sm_path):
        with open(sm_path, encoding="utf-8") as f:
            sm = json.load(f)
        errs = v.validate_file("seed-manifest.schema.json", sm) + verify_envelope(sm)
        counts_ok = all(c > 0 for c in sm["payload"]["row_counts"].values())
        check("Manifest seeda zgodny ze schematem", not errs, "; ".join(errs[:5]))
        check("Seed ma niepuste liczby wierszy", counts_ok, str(sm["payload"]["row_counts"]))
    else:
        check("Manifest seeda istnieje", False, "brak seed-manifest.json")

    # 4. kontrakty frozen z realnym silnikiem
    cat = sri_engine.Catalogue()
    scen = next((s for s in SCENARIOS if s["services"]), SCENARIOS[0])
    assessment = {
        "methodology_version_id": VERSION_ID,
        "building_type": scen["building_type"],
        "climate_zone": scen["climate_zone"],
        "services": scen["services"],
    }
    ai_errs = v.validate_file("assessment-input.schema.json", assessment)
    check("AssessmentInput (realny) zgodny ze schematem", not ai_errs, "; ".join(ai_errs[:5]))

    val_errs = sri_engine.validate_assessment(cat, assessment)
    check("AssessmentInput przechodzi walidacje silnika", not val_errs, "; ".join(val_errs[:5]))

    res = sri_engine.compute_sri(cat, assessment)
    cr = to_calculation_result(res)
    cr_errs = v.validate_file("calculation-result.schema.json", cr)
    check("CalculationResult (realny wynik silnika) zgodny ze schematem", not cr_errs, "; ".join(cr_errs[:5]))

    # 5. determinizm
    res2 = sri_engine.compute_sri(cat, assessment)
    det = abs(res["sri_percent"] - res2["sri_percent"]) < 1e-12
    check("Determinizm silnika (2x te same wejscia)", det,
          f"{res['sri_percent']:.6f} vs {res2['sri_percent']:.6f}")

    # zapis raportu
    report = {
        "version_id": VERSION_ID,
        "all_passed": all(c["passed"] for c in checks),
        "checks": checks,
        "sample_scenario": scen["id"],
        "sample_result_percent": round(res["sri_percent"], 2),
        "sample_class": res["class_label"],
    }
    os.makedirs(GENERATED_ROOT, exist_ok=True)
    with open(os.path.join(GENERATED_ROOT, "FINAL_CORE_VALIDATION.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return report


def main():
    report = run()
    print("=" * 70)
    print("FINAL CORE VALIDATION")
    print("=" * 70)
    for c in report["checks"]:
        mark = "OK " if c["passed"] else "BLAD"
        line = f"  [{mark}] {c['name']}"
        if not c["passed"] and c["detail"]:
            line += f"  -> {c['detail']}"
        print(line)
    print("-" * 70)
    print(f"Scenariusz kontrolny: {report['sample_scenario']} = "
          f"{report['sample_result_percent']}% klasa {report['sample_class']}")
    print("WYNIK:", "✅ FUNDAMENT OK" if report["all_passed"] else "❌ SA BLEDY")
    sys.exit(0 if report["all_passed"] else 1)


if __name__ == "__main__":
    main()
