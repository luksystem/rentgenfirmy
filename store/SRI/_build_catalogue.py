"""Transform: raw/*.json (z arkusza KE v4.5) -> finalny katalog docs/sri/catalogue/.
Dodaje pelna proweniencje importu (import-manifest.json). Tylko stdlib.
"""
import hashlib
import json
import os
import sys
from datetime import date

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# --- Konfiguracja proweniencji -------------------------------------------------
IMPORTER_VERSION = "1.0.0"
SOURCE_VERSION = "SRI calculation sheet v4.5"
SOURCE_METHODOLOGY = "eu-2020-2155-v1"
SOURCE_FILES = [
    ("SRI_calculation-sheet_v4.5.xlsx", "primary_dataset"),
    ("Practical Guide SRI calculation framework v4.5.pdf", "practical_guide"),
]

RAW = "raw"
OUT = os.path.join("..", "..", "docs", "sri", "catalogue")

DOMAIN_SNAKE = {
    "H": "heating",
    "DHW": "domestic_hot_water",
    "C": "cooling",
    "V": "ventilation",
    "L": "lighting",
    "DE": "dynamic_building_envelope",
    "E": "electricity",
    "EV": "electric_vehicle_charging",
    "MC": "monitoring_and_control",
}
DOMAIN_ORDER = ["H", "DHW", "C", "V", "L", "DE", "E", "EV", "MC"]

CRITERIA = [
    "energy_efficiency",
    "energy_flexibility_and_storage",
    "comfort",
    "convenience",
    "health_wellbeing_accessibility",
    "maintenance_and_fault_prediction",
    "information_to_occupants",
]

# Klasy SRI (Annex VIII Reg. 2020/2155) - progi procentowe
CLASS_BANDS = [
    {"class_number": 1, "label": "A", "score_min_percent": 90, "score_max_percent": 100},
    {"class_number": 2, "label": "B", "score_min_percent": 80, "score_max_percent": 90},
    {"class_number": 3, "label": "C", "score_min_percent": 65, "score_max_percent": 80},
    {"class_number": 4, "label": "D", "score_min_percent": 50, "score_max_percent": 65},
    {"class_number": 5, "label": "E", "score_min_percent": 35, "score_max_percent": 50},
    {"class_number": 6, "label": "F", "score_min_percent": 20, "score_max_percent": 35},
    {"class_number": 7, "label": "G", "score_min_percent": 0, "score_max_percent": 20},
]

KEY_FUNCTIONALITIES = [
    {"code": "energy_performance_and_operation", "sort_order": 1,
     "name_en": "Energy performance and operation", "name_pl": "Efektywność energetyczna i eksploatacja"},
    {"code": "response_to_occupant_needs", "sort_order": 2,
     "name_en": "Response to user needs", "name_pl": "Reakcja na potrzeby użytkowników"},
    {"code": "energy_flexibility", "sort_order": 3,
     "name_en": "Energy flexibility", "name_pl": "Elastyczność energetyczna"},
]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_checksum(obj):
    payload = json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def is_real_level(lv):
    d = str(lv.get("description", "")).strip()
    scores = lv.get("scores", {})
    if d in ("", "0", "#REF!"):
        if all(v in (None, 0) for v in scores.values()):
            return False
    return True


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


def write_out(name, obj):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"  -> {os.path.relpath(path)}")


def main():
    services = load("services.json")
    matrices = load("impact-matrices.json")
    weights = load("weights.json")

    # istniejacy plik z kodami wewnetrznymi i recznie odtworzonymi polami PL
    legacy_path = os.path.join(OUT, "method-b-services.json")
    legacy = {}
    if os.path.exists(legacy_path):
        with open(legacy_path, encoding="utf-8") as f:
            leg = json.load(f)
        by_domain = {}
        for s in leg.get("services", []):
            by_domain.setdefault(s["domain_code"], []).append(s)
        for d in by_domain:
            by_domain[d].sort(key=lambda x: x.get("sort_order", 0))
        legacy = by_domain

    mb = [s for s in services if s.get("method_b") == 1]
    mb_by_domain = {}
    for s in mb:
        mb_by_domain.setdefault(s["domain_code"], []).append(s)

    mat_by_code = {}
    for v in matrices.values():
        for s in v:
            mat_by_code[s["official_code"]] = s

    # --- services (authoritative) ---
    out_services = []
    impact_scores = {}
    sort_order = 0
    for dcode in DOMAIN_ORDER:
        snake = DOMAIN_SNAKE[dcode]
        raw_list = mb_by_domain.get(dcode, [])
        legacy_list = legacy.get(snake, [])
        for i, s in enumerate(raw_list):
            sort_order += 1
            official_code = s["official_code"]
            leg = legacy_list[i] if i < len(legacy_list) else {}
            m = mat_by_code.get(official_code, {"levels": []})
            real_levels = [lv for lv in m["levels"] if is_real_level(lv)]
            flmax = max((lv["level"] for lv in real_levels), default=0)
            fl_desc = [d for d in s["fl_descriptions"]]

            out_services.append({
                "official_code": official_code,
                "internal_code": leg.get("code"),
                "domain_code": snake,
                "sort_order": sort_order,
                "official_name_en": s["service_name"],
                "official_name_pl": leg.get("official_name_pl"),
                "service_group_en": s["service_group"],
                "included_in_method_a": s.get("method_a") == 1,
                "included_in_method_b": True,
                "triage_affects_max": s.get("triage") == 1,
                "preconditions_en": s.get("preconditions") or None,
                "fl_max": flmax,
                "functionality_levels": [
                    {"level": lv["level"], "official_description_en": lv["description"]}
                    for lv in real_levels
                ],
                "purpose_en": leg.get("purpose_en"),
                "when_applicable_en": leg.get("when_applicable_en"),
                "typical_devices_en": leg.get("typical_devices_en"),
                "standards_basis": leg.get("standards_basis"),
                "applicability_mode": leg.get("applicability_mode", "smart_ready"),
                "mutual_exclusion_group": leg.get("mutual_exclusion_group"),
                "provenance": "VERIFIED_ANNEX_D",
                "curated_fields_provenance": {
                    "official_name_pl": "RECONSTRUCTED",
                    "purpose_en": "RECONSTRUCTED",
                    "when_applicable_en": "RECONSTRUCTED",
                    "typical_devices_en": "RECONSTRUCTED",
                },
            })

            impact_scores[official_code] = [
                {"level": lv["level"], "scores": {c: lv["scores"].get(c) for c in CRITERIA}}
                for lv in real_levels
            ]

    # --- domain weights ---
    domain_weights = []
    bt_map = {"residential": "residential", "non-residential": "non_residential"}
    for bt_raw, data in weights.items():
        bt = bt_map[bt_raw]
        for zone, dw in data["domain_weights"].items():
            for dcode_raw, crit_vals in dw.items():
                snake = DOMAIN_SNAKE.get(dcode_raw, dcode_raw)
                for crit, val in crit_vals.items():
                    if val is None:
                        continue
                    domain_weights.append({
                        "building_type": bt,
                        "climate_zone": zone,
                        "domain_code": snake,
                        "impact_criterion_code": crit,
                        "weight": round(val, 10),
                    })

    # --- impact criterion weights W_f(ic) ---
    impact_weights = []
    for bt_raw, data in weights.items():
        bt = bt_map[bt_raw]
        for crit, val in data["impact_weights"].items():
            if val is None:
                continue
            impact_weights.append({
                "building_type": bt,
                "impact_criterion_code": crit,
                "weight": round(val, 10),
            })

    # --- manifest / proweniencja ---
    source_files_meta = []
    for fname, role in SOURCE_FILES:
        if os.path.exists(fname):
            source_files_meta.append({
                "filename": fname,
                "role": role,
                "size_bytes": os.path.getsize(fname),
                "sha256": sha256_file(fname),
            })

    dataset_checksum = canonical_checksum({
        "services": out_services,
        "impact_scores": impact_scores,
        "domain_weights": domain_weights,
        "impact_weights": impact_weights,
    })

    manifest = {
        "source_version": SOURCE_VERSION,
        "methodology_version": SOURCE_METHODOLOGY,
        "legal_basis": "Delegated Regulation (EU) 2020/2155 + Implementing Regulation (EU) 2020/2156",
        "import_date": date.today().isoformat(),
        "importer_version": IMPORTER_VERSION,
        "import_hash_algo": "sha256",
        "source_files": source_files_meta,
        "import_hash": next((f["sha256"] for f in source_files_meta if f["role"] == "primary_dataset"), None),
        "source_checksum": dataset_checksum,
        "source_checksum_scope": "canonical sha256 of normalized {services, impact_scores, domain_weights, impact_weights}",
        "record_counts": {
            "services_method_b": len(out_services),
            "services_method_a": sum(1 for s in out_services if s["included_in_method_a"]),
            "impact_score_rows": sum(len(v) for v in impact_scores.values()),
            "domain_weight_rows": len(domain_weights),
            "impact_weight_rows": len(impact_weights),
            "class_bands": len(CLASS_BANDS),
        },
        "climate_zones": sorted({dw["climate_zone"] for dw in domain_weights}),
        "building_types": sorted({dw["building_type"] for dw in domain_weights}),
        "notes": "Wyekstrahowane z oficjalnego arkusza KE. Pliki zrodlowe (Excel/PDF) nie sa w repo (T&C KE) - hashe pozwalaja zweryfikowac tozsamosc pliku przy nastepnym imporcie.",
    }

    print("Zapisywanie katalogu:")
    write_out("import-manifest.json", manifest)
    write_out("services-authoritative.json", {
        "catalogue_id": "eu-method-b-2020-v4.5",
        "methodology_version": SOURCE_METHODOLOGY,
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_ANNEX_D",
        "service_count": len(out_services),
        "services": out_services,
    })
    write_out("impact-scores.json", {
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_ANNEX_D",
        "score_scale": {"min": -2, "max": 3, "note": "wartosci ujemne dozwolone (metodologia SRI)"},
        "impact_criteria_order": CRITERIA,
        "scores_by_service": impact_scores,
    })
    write_out(os.path.join("weights", "domain-impact-weights.json"), {
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_ANNEX_D",
        "weights": domain_weights,
    })
    write_out(os.path.join("weights", "impact-criterion-weights.json"), {
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_ANNEX_D",
        "note": "W_f(ic) - wagi kryteriow oddzialywania, suma = 1 per typ budynku",
        "weights": impact_weights,
    })
    write_out("class-bands.json", {
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_REGULATION",
        "legal_basis": "Delegated Regulation (EU) 2020/2155, Annex VIII",
        "bands": CLASS_BANDS,
    })
    write_out("key-functionalities.json", {
        "source_version": SOURCE_VERSION,
        "provenance": "VERIFIED_REGULATION",
        "legal_basis": "Delegated Regulation (EU) 2020/2155, Annex I/III",
        "key_functionalities": KEY_FUNCTIONALITIES,
    })

    print("\nPodsumowanie:")
    for k, v in manifest["record_counts"].items():
        print(f"  {k}: {v}")
    print(f"  import_hash (Excel): {manifest['import_hash'][:16]}...")
    print(f"  source_checksum (dane): {manifest['source_checksum'][:16]}...")


if __name__ == "__main__":
    main()
