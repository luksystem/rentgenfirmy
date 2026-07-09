# -*- coding: utf-8 -*-
"""Provenance + canonical checksum + koperta artefaktu (Artifact Envelope).

Kazdy artefakt maszynowy platformy jest pakowany w KOPERTE:

    { "provenance": { ...naglowek... }, "payload": { ...wlasciwa tresc... } }

Naglowek prowenansu (ZAMROZONY kontrakt, patrz FINAL_CORE_ARCHITECTURE.md):
  - artifact_type            typ artefaktu (enum)
  - methodology_version_id   z ktora wersja metodologii jest zwiazany
  - schema_version           semver schematu koperty/payloadu
  - engine_version           wersja generatora
  - generated_by             skrypt/proces
  - generated_at             ISO8601 UTC
  - source_checksum          checksum zrodla (np. arkusz KE) - niesiony przez lancuch
  - payload_checksum         sha256 kanoniczny payloadu (wykrywanie manipulacji/dryfu)

payload_checksum liczony jest WYLACZNIE z payloadu (bez naglowka), dzieki czemu jest
deterministyczny miedzy uruchomieniami (generated_at w naglowku nie wplywa na checksum).
"""
import datetime
import hashlib
import json

CORE_ENGINE_VERSION = "1.0.0"
ENVELOPE_SCHEMA_VERSION = "1.0.0"

ARTIFACT_TYPES = {
    "catalogue_services",
    "catalogue_impact_scores",
    "catalogue_domain_weights",
    "catalogue_criterion_weights",
    "catalogue_class_bands",
    "catalogue_impact_criteria",
    "catalogue_key_functionalities",
    "catalogue_domains",
    "dependency_graph",
    "capabilities_catalog",
    "recommendation_graph",
    "expected_gain_model",
    "optimization_rules",
    "service_knowledge",
    "methodology_registry",
    "methodology_diffs",
    "compatibility_matrix",
    "seed_manifest",
    "artifact_index",
}


def canonical_json(obj):
    """Stabilna, kanoniczna serializacja (posortowane klucze, bez zbednych spacji)."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def checksum(obj):
    """sha256 kanonicznej serializacji obiektu."""
    return hashlib.sha256(canonical_json(obj).encode("utf-8")).hexdigest()


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_envelope(
    artifact_type,
    methodology_version_id,
    payload,
    source_checksum,
    generated_by,
    engine_version=CORE_ENGINE_VERSION,
    schema_version=ENVELOPE_SCHEMA_VERSION,
    generated_at=None,
    extra=None,
):
    if artifact_type not in ARTIFACT_TYPES:
        raise ValueError(f"Nieznany artifact_type: {artifact_type!r}")
    header = {
        "artifact_type": artifact_type,
        "methodology_version_id": methodology_version_id,
        "schema_version": schema_version,
        "engine_version": engine_version,
        "generated_by": generated_by,
        "generated_at": generated_at or now_iso(),
        "source_checksum": source_checksum,
        "payload_checksum": checksum(payload),
    }
    if extra:
        header.update(extra)
    return {"provenance": header, "payload": payload}


def verify_envelope(envelope):
    """Zwraca liste bledow integralnosci koperty (pusta = OK)."""
    errors = []
    if not isinstance(envelope, dict) or "provenance" not in envelope or "payload" not in envelope:
        return ["Koperta musi zawierac 'provenance' i 'payload'."]
    prov = envelope["provenance"]
    for k in ("artifact_type", "methodology_version_id", "schema_version",
              "engine_version", "generated_by", "generated_at", "payload_checksum"):
        if k not in prov:
            errors.append(f"Brak pola provenance.{k}")
    if "payload_checksum" in prov:
        actual = checksum(envelope["payload"])
        if actual != prov["payload_checksum"]:
            errors.append(
                f"Niezgodny payload_checksum: naglowek={prov['payload_checksum'][:12]}..., "
                f"policzony={actual[:12]}... (payload zmodyfikowany?)"
            )
    if prov.get("artifact_type") not in ARTIFACT_TYPES:
        errors.append(f"Nieznany artifact_type: {prov.get('artifact_type')!r}")
    return errors
