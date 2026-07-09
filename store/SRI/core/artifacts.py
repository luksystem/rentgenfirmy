# -*- coding: utf-8 -*-
"""Artifact packaging + compatibility matrix + artifact index.

Bierze zbudowane artefakty z docs/sri/** i publikuje je jako WERSJONOWANE koperty w
generated/<methodology_version_id>/**. Kazda koperta ma provenance + payload_checksum i jest
walidowana schematem artifact-envelope. Buduje tez macierz zgodnosci i indeks artefaktow.

To realizuje: Artifact Versioning + Schema Contracts (walidacja) z zadania.
"""
import json
import os

from provenance import (
    make_envelope,
    checksum,
    CORE_ENGINE_VERSION,
    ENVELOPE_SCHEMA_VERSION,
)

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DOCS_SRI = os.path.join(ROOT, "docs", "sri")
SCHEMA_DIR = os.path.join(ROOT, "schemas")
GENERATED_ROOT = os.path.join(ROOT, "generated")

# Kanoniczny identyfikator wersji bazowej (FINAL_CORE_ARCHITECTURE).
DEFAULT_VERSION_ID = "eu-sri-v4.5"

# (artifact_type, source_rel_path, out_rel_path)
PACKAGE_SPEC = [
    ("catalogue_services", ["catalogue", "services-authoritative.json"], ["catalogue", "services.json"]),
    ("catalogue_impact_scores", ["catalogue", "impact-scores.json"], ["catalogue", "impact-scores.json"]),
    ("catalogue_domain_weights", ["catalogue", "weights", "domain-impact-weights.json"], ["catalogue", "domain-weights.json"]),
    ("catalogue_criterion_weights", ["catalogue", "weights", "impact-criterion-weights.json"], ["catalogue", "criterion-weights.json"]),
    ("catalogue_class_bands", ["catalogue", "class-bands.json"], ["catalogue", "class-bands.json"]),
    ("catalogue_impact_criteria", ["catalogue", "impact-criteria.json"], ["catalogue", "impact-criteria.json"]),
    ("catalogue_key_functionalities", ["catalogue", "key-functionalities.json"], ["catalogue", "key-functionalities.json"]),
    ("catalogue_domains", ["catalogue", "domains.json"], ["catalogue", "domains.json"]),
    ("dependency_graph", ["dependency", "SRI_DEPENDENCY_GRAPH.json"], ["dependency-graph.json"]),
    ("capabilities_catalog", ["dependency", "SRI_CAPABILITIES_CATALOG.json"], ["capabilities-catalog.json"]),
    ("recommendation_graph", ["recommendation", "SRI_RECOMMENDATION_GRAPH.json"], ["recommendation-graph.json"]),
    ("expected_gain_model", ["recommendation", "SRI_EXPECTED_GAIN_MODEL.json"], ["expected-gain-model.json"]),
    ("optimization_rules", ["optimization", "SRI_RECOMMENDATION_GROUPING_RULES.json"], ["optimization-rules.json"]),
]


def _read(*parts):
    with open(os.path.join(DOCS_SRI, *parts), encoding="utf-8") as f:
        return json.load(f)


def _write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def source_checksum():
    return _read("import-manifest.json").get("source_checksum") if os.path.exists(
        os.path.join(DOCS_SRI, "import-manifest.json")) else _read("catalogue", "import-manifest.json").get("source_checksum")


def _manifest_checksum():
    return _read("catalogue", "import-manifest.json").get("source_checksum")


def package(out_root, version_id=DEFAULT_VERSION_ID, validator=None):
    """Publikuje wszystkie artefakty do out_root/<version_id>/. Zwraca raport."""
    src_checksum = _manifest_checksum()
    vdir = os.path.join(out_root, version_id)
    written = []
    errors = []

    def emit(artifact_type, out_rel, payload, generated_by):
        env = make_envelope(
            artifact_type=artifact_type,
            methodology_version_id=version_id,
            payload=payload,
            source_checksum=src_checksum,
            generated_by=generated_by,
        )
        if validator is not None:
            errs = validator.validate_file("artifact-envelope.schema.json", env)
            if errs:
                errors.extend([f"{'/'.join(out_rel)}: {e}" for e in errs])
        path = os.path.join(vdir, *out_rel)
        _write_json(path, env)
        written.append({
            "artifact_type": artifact_type,
            "path": os.path.relpath(path, out_root).replace("\\", "/"),
            "payload_checksum": env["provenance"]["payload_checksum"],
        })

    # 1. artefakty wg specyfikacji
    for artifact_type, src_rel, out_rel in PACKAGE_SPEC:
        payload = _read(*src_rel)
        emit(artifact_type, out_rel, payload, generated_by="core/artifacts.py")

    # 2. service knowledge (per domena)
    kdir = os.path.join(DOCS_SRI, "knowledge")
    if os.path.isdir(kdir):
        for fn in sorted(os.listdir(kdir)):
            if not fn.endswith(".json") or fn == "index.json":
                continue
            payload = _read("knowledge", fn)
            emit("service_knowledge", ["service-knowledge", fn], payload, generated_by="core/artifacts.py")

    # 3. indeks artefaktow
    index_payload = {
        "methodology_version_id": version_id,
        "source_checksum": src_checksum,
        "artifact_count": len(written),
        "artifacts": written,
    }
    index_env = make_envelope(
        artifact_type="artifact_index",
        methodology_version_id=version_id,
        payload=index_payload,
        source_checksum=src_checksum,
        generated_by="core/artifacts.py",
    )
    if validator is not None:
        errs = validator.validate_file("artifact-envelope.schema.json", index_env)
        errors.extend([f"index.json: {e}" for e in errs])
    _write_json(os.path.join(vdir, "index.json"), index_env)

    return {"version_id": version_id, "written": written, "errors": errors, "dir": vdir}


def build_compatibility_matrix(out_root, validator=None):
    """Buduje macierz zgodnosci z rejestru metodologii + opublikowanych artefaktow."""
    registry = _read("methodology", "METHODOLOGY_REGISTRY.json")
    versions = registry.get("versions", [])
    methodologies = []
    for v in versions:
        vid = v["id"]
        vdir = os.path.join(out_root, vid)
        artifacts = []
        if os.path.isdir(vdir):
            idx_path = os.path.join(vdir, "index.json")
            if os.path.exists(idx_path):
                with open(idx_path, encoding="utf-8") as f:
                    idx = json.load(f)
                artifacts = [a["artifact_type"] for a in idx["payload"]["artifacts"]]
        methodologies.append({
            "methodology_version_id": vid,
            "methodology_type": v.get("methodology_type"),
            "country": v.get("country"),
            "status": v.get("status", "draft"),
            "engine_version": CORE_ENGINE_VERSION,
            "compatible_runtime": ">=1.0.0 <2.0.0",
            "inherits_from": v.get("inherits_from"),
            "migration_from": [v["inherits_from"]] if v.get("inherits_from") else [],
            "source_checksum": v.get("source_checksum"),
            "artifacts": artifacts,
        })

    payload = {
        "core_engine_version": CORE_ENGINE_VERSION,
        "envelope_schema_version": ENVELOPE_SCHEMA_VERSION,
        "methodologies": methodologies,
    }
    env = make_envelope(
        artifact_type="compatibility_matrix",
        methodology_version_id="__platform__",
        payload=payload,
        source_checksum=None,
        generated_by="core/artifacts.py",
    )
    errors = []
    if validator is not None:
        errors = validator.validate_file("compatibility-matrix.schema.json", env)
    _write_json(os.path.join(out_root, "compatibility-matrix.json"), env)
    return {"methodologies": len(methodologies), "errors": errors}
