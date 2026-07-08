"""Generuje powtarzalny seed SQL z docs/sri/catalogue/ -> supabase/seed/096_sri_catalogue_seed.sql.
Deterministyczne UUID (uuid5) => idempotentne. Nowa wersja SRI = nowy catalogue_code
(np. eu-method-b-2020-v5.0), stary katalog zostaje do porownan. Tylko stdlib.
"""
import json
import os
import sys
import uuid

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

CAT = os.path.join("..", "..", "docs", "sri", "catalogue")
OUT = os.path.join("..", "..", "supabase", "seed", "096_sri_catalogue_seed.sql")
MVER = "eu-2020-2155-v1"
CATALOGUE_CODE = "eu-method-b-2020-v4.5"
NS = uuid.UUID("5a1b0000-0000-4000-a000-000000000000")


def uid(*parts):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in parts)))


def q(s):
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


def jq(obj):
    if obj is None:
        return "null"
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def arr(items):
    if not items:
        return "null"
    inner = ",".join('"' + str(i).replace('"', '\\"').replace("'", "''") + '"' for i in items)
    return "'{" + inner + "}'"


def load(*p):
    with open(os.path.join(CAT, *p), encoding="utf-8") as f:
        return json.load(f)


def main():
    services = load("services-authoritative.json")["services"]
    scores = load("impact-scores.json")["scores_by_service"]
    domain_weights = load("weights", "domain-impact-weights.json")["weights"]
    impact_weights = load("weights", "impact-criterion-weights.json")["weights"]

    lines = []
    a = lines.append
    a("-- WYGENEROWANY AUTOMATYCZNIE przez store/sri/_gen_seed_sql.py — nie edytuj recznie.")
    a("-- Zrodlo: docs/sri/catalogue/ (SRI v4.5). Uruchom PO migracji 096_sri_catalogue.sql.")
    a("-- Idempotentny (uuid5 + ON CONFLICT). Nowa wersja SRI => nowy catalogue_code.")
    a("")
    a(f"-- helpery: id metodologii, katalogu, domen, kryteriow czytamy po kodach")
    a(f"do $$")
    a(f"declare")
    a(f"  v_mid uuid;")
    a(f"  v_cat uuid;")
    a(f"begin")
    a(f"  select id into v_mid from public.sri_methodology_versions where code = {q(MVER)};")
    a(f"  select id into v_cat from public.sri_catalogues where methodology_version_id = v_mid and code = {q(CATALOGUE_CODE)};")
    a(f"  if v_mid is null or v_cat is null then")
    a(f"    raise exception 'Brak metodologii/katalogu — uruchom najpierw migracje 096.';")
    a(f"  end if;")
    a("")

    # --- services + FL + scores ---
    for s in services:
        sid = uid("svc", CATALOGUE_CODE, s["official_code"])
        name = {"en": s.get("official_name_en"), "pl": s.get("official_name_pl")}
        purpose = {"en": s["purpose_en"]} if s.get("purpose_en") else None
        when = {"en": s["when_applicable_en"]} if s.get("when_applicable_en") else None
        a(f"  insert into public.sri_services (id, catalogue_id, domain_id, official_code, internal_code, sort_order, official_name, service_group, purpose, when_applicable, typical_devices, preconditions, fl_max, included_in_method_a, included_in_method_b, triage_affects_max, applicability_mode, mutual_exclusion_group, standards_basis, provenance)")
        a(f"  values ({q(sid)}, v_cat, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code={q(s['domain_code'])}), {q(s['official_code'])}, {q(s.get('internal_code'))}, {s['sort_order']}, {jq(name)}, {q(s.get('service_group_en'))}, {jq(purpose)}, {jq(when)}, {arr(s.get('typical_devices_en'))}, {q(s.get('preconditions_en'))}, {s.get('fl_max') if s.get('fl_max') is not None else 'null'}, {str(s['included_in_method_a']).lower()}, {str(s['included_in_method_b']).lower()}, {str(s['triage_affects_max']).lower()}, {q(s.get('applicability_mode','smart_ready'))}, {q(s.get('mutual_exclusion_group'))}, {arr(s.get('standards_basis'))}, {q(s.get('provenance','VERIFIED_ANNEX_D'))})")
        a(f"  on conflict (catalogue_id, official_code) do nothing;")

        for lv in s["functionality_levels"]:
            flid = uid("fl", CATALOGUE_CODE, s["official_code"], lv["level"])
            desc = {"en": lv.get("official_description_en")}
            a(f"  insert into public.sri_functionality_levels (id, service_id, level_number, official_description)")
            a(f"  values ({q(flid)}, {q(sid)}, {lv['level']}, {jq(desc)}) on conflict (service_id, level_number) do nothing;")

        for row in scores.get(s["official_code"], []):
            flid = uid("fl", CATALOGUE_CODE, s["official_code"], row["level"])
            for crit, val in row["scores"].items():
                if val is None:
                    continue
                a(f"  insert into public.sri_functionality_level_impact_scores (functionality_level_id, impact_criterion_id, score)")
                a(f"  values ({q(flid)}, (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(crit)}), {int(round(val))}) on conflict (functionality_level_id, impact_criterion_id) do nothing;")
        a("")

    # --- impact criterion weights ---
    a("  -- wagi kryteriow W_f(ic)")
    for w in impact_weights:
        a(f"  insert into public.sri_impact_criterion_weights (methodology_version_id, impact_criterion_id, building_type, weight)")
        a(f"  values (v_mid, (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(w['impact_criterion_code'])}), {q(w['building_type'])}, {w['weight']}) on conflict (methodology_version_id, impact_criterion_id, building_type) do nothing;")
    a("")

    # --- domain weights ---
    a("  -- wagi domen W(d,ic) per typ budynku x strefa klimatyczna")
    for w in domain_weights:
        a(f"  insert into public.sri_domain_impact_weights (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone, weight)")
        a(f"  values (v_mid, (select id from public.sri_technical_domains where methodology_version_id=v_mid and code={q(w['domain_code'])}), (select id from public.sri_impact_criteria where methodology_version_id=v_mid and code={q(w['impact_criterion_code'])}), {q(w['building_type'])}, {q(w['climate_zone'])}, {w['weight']}) on conflict (methodology_version_id, domain_id, impact_criterion_id, building_type, climate_zone) do nothing;")

    a("")
    a("end $$;")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Zapisano {os.path.relpath(OUT)} ({len(lines)} linii)")
    print(f"  uslugi: {len(services)}")
    print(f"  wagi domen: {len(domain_weights)}  wagi kryteriow: {len(impact_weights)}")


if __name__ == "__main__":
    main()
