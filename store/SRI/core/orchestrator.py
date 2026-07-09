# -*- coding: utf-8 -*-
"""Core Orchestrator - warstwa orkiestracji buildu artefaktow platformy.

DAG (kolejnosc wykonania):

  [catalogue integrity]
        |
        +--> methodology (rejestr wersji + diffy)      (niezalezny)
        +--> knowledge  (karty uslug)                  (niezalezny)
        +--> dependency (graf zaleznosci)
                 |
                 v
             recommendation (rekomendacje + expected gain)
                 |
                 v
             optimization (roadmapa, reguly grupowania)
        |
        v
  [package -> STAGING] --walidacja schematami--> [atomic swap -> generated/<version>]
        |
        v
  [compatibility matrix]
        |
        v
  [seed engine -> supabase/seed/<version>/seed.sql]

Cechy:
  - cache: krok pomijany, gdy checksum wejsc bez zmian i wyjscia istnieja (--force wymusza)
  - staging + atomic swap: publikacja tylko po udanej walidacji (rollback = odrzucenie staging)
  - error handling: blad kroku przerywa pipeline, brak czesciowej publikacji
"""
import hashlib
import glob
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SRI_DIR = os.path.abspath(os.path.join(HERE, ".."))
GENERATED_ROOT = os.path.join(ROOT, "generated")
STAGING_ROOT = os.path.join(GENERATED_ROOT, ".staging")
CACHE_FILE = os.path.join(GENERATED_ROOT, ".cache", "build-state.json")
SCHEMA_DIR = os.path.join(ROOT, "schemas")
VERSION_ID = "eu-sri-v4.5"

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import artifacts
import seed_engine
from jsonschema_mini import SchemaValidator


def _sha_files(patterns):
    h = hashlib.sha256()
    files = []
    for pat in patterns:
        files.extend(sorted(glob.glob(pat, recursive=True)))
    for fp in sorted(set(files)):
        if os.path.isfile(fp):
            h.update(os.path.relpath(fp, ROOT).replace("\\", "/").encode())
            with open(fp, "rb") as f:
                h.update(f.read())
    return h.hexdigest()


def _load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


# Kroki builderow: (nazwa, skrypt, wzorce wejsc, wzorce wyjsc)
BUILDER_STEPS = [
    ("methodology", os.path.join(SRI_DIR, "methodology", "methodology_engine.py"),
     [os.path.join(SRI_DIR, "methodology", "*.py"), os.path.join(ROOT, "docs/sri/catalogue/**/*.json")],
     [os.path.join(ROOT, "docs/sri/methodology/METHODOLOGY_REGISTRY.json")]),
    ("knowledge", os.path.join(SRI_DIR, "knowledge", "build_knowledge.py"),
     [os.path.join(SRI_DIR, "knowledge", "**", "*.py"), os.path.join(ROOT, "docs/sri/catalogue/services-authoritative.json")],
     [os.path.join(ROOT, "docs/sri/knowledge/index.json")]),
    ("dependency", os.path.join(SRI_DIR, "dependency", "build_dependencies.py"),
     [os.path.join(SRI_DIR, "dependency", "*.py"), os.path.join(ROOT, "docs/sri/catalogue/services-authoritative.json")],
     [os.path.join(ROOT, "docs/sri/dependency/SRI_DEPENDENCY_GRAPH.json")]),
    ("recommendation", os.path.join(SRI_DIR, "recommendation", "build_recommendations.py"),
     [os.path.join(SRI_DIR, "recommendation", "*.py"), os.path.join(ROOT, "docs/sri/dependency/*.json"),
      os.path.join(ROOT, "docs/sri/knowledge/*.json")],
     [os.path.join(ROOT, "docs/sri/recommendation/SRI_RECOMMENDATION_GRAPH.json")]),
    ("optimization", os.path.join(SRI_DIR, "optimization", "build_optimization.py"),
     [os.path.join(SRI_DIR, "optimization", "*.py"), os.path.join(ROOT, "docs/sri/recommendation/*.json")],
     [os.path.join(ROOT, "docs/sri/optimization/SRI_RECOMMENDATION_GROUPING_RULES.json")]),
]


def run_builder(name, script, inputs, outputs, cache, force):
    in_hash = _sha_files(inputs)
    outputs_exist = all(glob.glob(p) for p in outputs)
    if not force and cache.get(name) == in_hash and outputs_exist:
        print(f"  [skip] {name} (bez zmian wejsc)")
        return True
    print(f"  [run ] {name} ...")
    res = subprocess.run([sys.executable, script], cwd=SRI_DIR,
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    if res.returncode != 0:
        print(f"  [FAIL] {name} (exit {res.returncode})")
        print((res.stderr or res.stdout or "")[-1500:])
        return False
    cache[name] = _sha_files(inputs)
    print(f"  [ok  ] {name}")
    return True


def package_and_swap(validator):
    """Pakuje do staging, waliduje, atomowo publikuje do generated/<version>."""
    if os.path.exists(STAGING_ROOT):
        shutil.rmtree(STAGING_ROOT)
    os.makedirs(STAGING_ROOT, exist_ok=True)

    report = artifacts.package(STAGING_ROOT, version_id=VERSION_ID, validator=validator)
    if report["errors"]:
        print("  [FAIL] walidacja schematami w staging:")
        for e in report["errors"][:20]:
            print("        - " + e)
        shutil.rmtree(STAGING_ROOT, ignore_errors=True)  # rollback
        return None

    # atomic swap
    target = os.path.join(GENERATED_ROOT, VERSION_ID)
    staged = os.path.join(STAGING_ROOT, VERSION_ID)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.move(staged, target)
    shutil.rmtree(STAGING_ROOT, ignore_errors=True)
    print(f"  [ok  ] opublikowano {len(report['written'])} artefaktow -> generated/{VERSION_ID}/")
    return report


def main():
    force = "--force" in sys.argv
    run_builders = "--no-build" not in sys.argv
    validator = SchemaValidator(SCHEMA_DIR)
    cache = _load_cache()

    print("=" * 70)
    print("CORE ORCHESTRATOR")
    print("=" * 70)

    if run_builders:
        print("\n[1] Buildery (DAG, z cache):")
        for name, script, inputs, outputs in BUILDER_STEPS:
            if not run_builder(name, script, inputs, outputs, cache, force):
                _save_cache(cache)
                print("\nPIPELINE PRZERWANY na kroku:", name)
                sys.exit(1)
        _save_cache(cache)
    else:
        print("\n[1] Buildery pominiete (--no-build)")

    print("\n[2] Pakowanie + walidacja + publikacja (staging -> generated):")
    report = package_and_swap(validator)
    if report is None:
        print("\nPIPELINE PRZERWANY: walidacja artefaktow nie przeszla (brak publikacji).")
        sys.exit(1)

    print("\n[3] Macierz zgodnosci:")
    cm = artifacts.build_compatibility_matrix(GENERATED_ROOT, validator=validator)
    if cm["errors"]:
        print("  [FAIL] macierz zgodnosci:")
        for e in cm["errors"]:
            print("        - " + e)
        sys.exit(1)
    print(f"  [ok  ] macierz zgodnosci ({cm['methodologies']} wersji)")

    print("\n[4] Seed engine (transakcyjny):")
    seed = seed_engine.generate(version_id=VERSION_ID, generated_root=GENERATED_ROOT)
    if not seed["ok"]:
        print("  [FAIL] seed engine:")
        for e in seed["errors"]:
            print("        - " + e)
        sys.exit(1)
    print(f"  [ok  ] {seed['seed_path']} ({seed['lines']} linii)")
    print(f"         row_counts: {seed['row_counts']}")

    print("\nORKESTRACJA ZAKONCZONA ✅")


if __name__ == "__main__":
    main()
