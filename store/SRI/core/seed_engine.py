# -*- coding: utf-8 -*-
"""Seed Engine - transakcyjny, idempotentny import metodologii do bazy.

Wejscie:  generated/<version>/catalogue/*.json (koperty artefaktow)
Wyjscie:  supabase/seed/<version>/seed.sql        (jeden plik transakcyjny)
          generated/<version>/seed-manifest.json  (manifest importu)

Cechy (z zadania):
  - transakcyjnosc:      caly seed w BEGIN; ... COMMIT; (all-or-nothing)
  - idempotentnosc:      deterministyczne uuid5 + ON CONFLICT DO NOTHING
  - rollback:            RAISE w bloku -> pelny rollback transakcji
  - partial recovery:    brak czesciowego zapisu (transakcja); ponowny run bezpieczny
  - preflight validation: sprawdzenie kopert (checksum) i niepustych zbiorow przed generacja
"""
import json
import os
import uuid

from provenance import make_envelope, checksum, verify_envelope

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
GENERATED_ROOT = os.path.join(ROOT, "generated")
SEED_ROOT = os.path.join(ROOT, "supabase", "seed")

# Stabilny namespace uuid5 - MUSI byc zgodny z historycznym seedem (idempotencja z istniejaca baza).
NS = uuid.UUID("5a1b0000-0000-4000-a000-000000000000")

# Mapowanie kanonicznego version_id -> (kod metodologii w DB, kod katalogu w DB).
VERSION_DB_MAP = {
    "eu-sri-v4.5": ("eu-2020-2155-v1", "eu-method-b-2020-v4.5"),
}


def uid(*parts):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in parts)))


def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def jq(obj):
    if obj is None:
        return "null"
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def arr(items):
    if not items:
        return "null"
    inner = ",".join('"' + str(i).replace('"', '\\"').replace("'", "''") + '"' for i in items)
    return "'{" + inner + "}'"


def _load_envelope(vdir, *rel):
    with open(os.path.join(vdir, *rel), encoding="utf-8") as f:
        return json.load(f)


def preflight(vdir):
    """Waliduje koperty katalogu przed generacja. Zwraca (payloads, errors)."""
    errors = []
    needed = {
        "services": ["catalogue", "services.json"],
        "scores": ["catalogue", "impact-scores.json"],
        "domain_weights": ["catalogue", "domain-weights.json"],
        "criterion_weights": ["catalogue", "criterion-weights.json"],
    }
    payloads = {}
    for key, rel in needed.items():
        path = os.path.join(vdir, *rel)
        if not os.path.exists(path):
            errors.append(f"Brak artefaktu: {'/'.join(rel)}")
            continue
        env = _load_envelope(vdir, *rel)
        errs = verify_envelope(env)
        if errs:
            errors.extend([f"{'/'.join(rel)}: {e}" for e in errs])
        payloads[key] = env["payload"]

    if not errors:
        if not payloads["services"].get("services"):
            errors.append("Pusty zbior uslug w katalogu.")
        if not payloads["domain_weights"].get("weights"):
            errors.append("Pusty zbior wag domen.")
    return payloads, errors


def generate(version_id="eu-sri-v4.5", generated_root=None, seed_root=None):
    generated_root = generated_root or GENERATED_ROOT
    seed_root = seed_root or SEED_ROOT
    vdir = os.path.join(generated_root, version_id)

    if version_id not in VERSION_DB_MAP:
        raise ValueError(f"Brak mapowania DB dla wersji {version_id!r} (uzupelnij VERSION_DB_MAP).")
    mver, catalogue_code = VERSION_DB_MAP[version_id]

    payloads, errors = preflight(vdir)
    if errors:
        return {"ok": False, "errors": errors}

    services = payloads["services"]["services"]
    scores = payloads["scores"]["scores_by_service"]
    domain_weights = payloads["domain_weights"]["weights"]
    impact_weights = payloads["criterion_weights"]["weights"]
    src_checksum = payloads["services"].get("source_version")  # informacyjnie

    counts = {"services": 0, "functionality_levels": 0, "impact_scores": 0,
              "domain_weights": 0, "criterion_weights": 0}

    L = []
    a = L.append
    a("-- WYGENEROWANY AUTOMATYCZNIE przez store/SRI/core/seed_engine.py - nie edytuj recznie.")
    a(f"-- Wersja metodologii: {version_id}  (DB: methodology={mver}, catalogue={catalogue_code})")
    a("-- Transakcyjny (BEGIN/COMMIT), idempotentny (uuid5 + ON CONFLICT). Uruchom PO migracji 096.")
    a("")
    a("begin;")
    a("")
    a("do $$")
    a("declare")
    a("  v_mid uuid;")
    a("  v_cat uuid;")
    a("begin")
    a(f"  select id into v_mid from public.sri_methodology_versions where code = {q(mver)};")
    a(f"  select id into v_cat from public.sri_catalogues where methodology_version_id = v_mid and code = {q(catalogue_code)};")
    a("  if v_mid is null or v_cat is null then")
    a("    raise exception 'Brak metodologii/katalogu - uruchom najpierw migracje 096_sri_catalogue.sql';")
    a("  end if;")
    a("")

    for s in services:
        sid = uid("svc", catalogue_code, s["official_code"])
        name = {"en": s.get("official_name_en"), "pl": s.get("official_name_pl")}
        purpose = {"en": s["purpose_en"]} if s.get("purpose_en") else None
        when = {"en": s["when_applicable_en"]} if s.get("when_applicable_en") else None
        a("  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)")
        a(f"  values ({q(sid)}, v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code={q(s['domain_code'])}), {q(s['official_code'])}, {q(s.get('internal_code'))}, {s['sort_order']}, {jq(name)}, {q(s.get('service_group_en'))}, {jq(purpose)}, {jq(when)}, {arr(s.get('typical_devices_en'))}, {q(s.get('preconditions_en'))}, {s.get('fl_max') if s.get('fl_max') is not None else 'null'}, {str(s['included_in_method_a']).lower()}, {str(s['included_in_method_b']).lower()}, {str(s['triage_affects_max']).lower()}, {q(s.get('applicability_mode','smart_ready'))}, {q(s.get('mutual_exclusion_group'))}, {arr(s.get('standards_basis'))}, {q(s.get('provenance','VERIFIED_ANNEX_D'))})")
        a("  on conflict (catalogue_id, official_code) do nothing;")
        counts["services"] += 1

        for lv in s["functionality_levels"]:
            flid = uid("fl", catalogue_code, s["official_code"], lv["level"])
            desc = {"en": lv.get("official_description_en")}
            a("  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)")
            a(f"  values ({q(flid)}, {q(sid)}, {lv['level']}, {jq(desc)}) on conflict (service_id, level_number) do nothing;")
            counts["functionality_levels"] += 1

        for row in scores.get(s["official_code"], []):
            flid = uid("fl", catalogue_code, s["official_code"], row["level"])
            for crit, val in row["scores"].items():
                if val is None:
                    continue
                a("  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)")
                a(f"  values ({q(flid)}, (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(crit)}), {int(round(val))}) on conflict (functionality_level_id, impact_criterion_id) do nothing;")
                counts["impact_scores"] += 1
        a("")

    a("  -- wagi kryteriow W_f(ic)")
    for w in impact_weights:
        a("  insert into public.sri_impact_criterion_weights (methodology_version_id, impact_criterion_id, building_type, weight)")
        a(f"  values (v_mid, (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(w['impact_criterion_code'])}), {q(w['building_type'])}, {w['weight']}) on conflict (methodology_version_id, impact_criterion_id, building_type) do nothing;")
        counts["criterion_weights"] += 1
    a("")

    a("  -- wagi domen W(d,ic) per typ budynku x strefa klimatyczna")
    for w in domain_weights:
        a("  insert into public.sri_domain_impact_weights (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone, weight)")
        a(f"  values (v_mid, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code={q(w['domain_code'])}), (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(w['impact_criterion_code'])}), {q(w['building_type'])}, {q(w['climate_zone'])}, {w['weight']}) on conflict (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone) do nothing;")
        counts["domain_weights"] += 1

    a("")
    a("end $$;")
    a("")
    a("commit;")

    seed_dir = os.path.join(seed_root, version_id)
    os.makedirs(seed_dir, exist_ok=True)
    seed_path = os.path.join(seed_dir, "seed.sql")
    with open(seed_path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")

    content_checksum = checksum({
        "services": services, "scores": scores,
        "domain_weights": domain_weights, "criterion_weights": impact_weights,
    })

    manifest_payload = {
        "methodology_version_id": version_id,
        "catalogue_code": catalogue_code,
        "seed_file": os.path.relpath(seed_path, ROOT).replace("\\", "/"),
        "transactional": True,
        "idempotent": True,
        "source_checksum": src_checksum,
        "content_checksum": content_checksum,
        "row_counts": counts,
    }
    manifest = make_envelope(
        artifact_type="seed_manifest",
        methodology_version_id=version_id,
        payload=manifest_payload,
        source_checksum=src_checksum,
        generated_by="core/seed_engine.py",
    )
    manifest_path = os.path.join(vdir, "seed-manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    return {"ok": True, "errors": [], "seed_path": seed_path, "manifest_path": manifest_path,
            "row_counts": counts, "lines": len(L)}
