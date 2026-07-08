"""Buduje ekspercka baze wiedzy SRI: 54 karty uslug (po jednej na usluge), 16 pol kazda.

Pola URZEDOWE (nazwa oficjalna, poziomy funkcjonalnosci + oficjalne opisy) pobierane sa
z zweryfikowanego katalogu docs/sri/catalogue/ (provenance VERIFIED_ANNEX_D).
Pola EKSPERCKIE (przyjazna nazwa, cel, opis techniczny, technologie, urzadzenia, audyt,
dowody, bledy, ograniczenia, zaleznosci, wplyw, modernizacje, przyklady) pochodza z
modulow store/sri/knowledge/expert/*.py (provenance EXPERT_AUTHORED).

Wynik: docs/sri/knowledge/<domena>.json (9 plikow) + index.json.
Tylko stdlib. Bez UI, bez formularzy.
"""
import importlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

CAT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "sri", "catalogue")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "sri", "knowledge")

EXPERT_MODULES = [
    "expert.heating", "expert.dhw", "expert.cooling", "expert.ventilation",
    "expert.lighting", "expert.envelope", "expert.electricity", "expert.ev",
    "expert.monitoring",
]

# 16 pol karty; pole 1 i 6 czerpia z katalogu, reszta z tresci eksperckiej
EXPERT_REQUIRED = [
    "friendly_name",        # 2. przyjazna nazwa
    "purpose",              # 3. cel
    "technical",            # 4. opis techniczny
    "energy_significance",  # 5. znaczenie dla efektywnosci energetycznej
    "level_notes",          # 6. praktyczny opis poziomow (dict level->tekst)
    "technologies",         # 7. typowe technologie
    "devices",              # 8. typowe urzadzenia
    "audit_verification",   # 9. jak zweryfikowac obecnosc podczas audytu
    "evidence",             # 10. dowody wdrozenia
    "common_mistakes",      # 11. typowe bledy wdrozeniowe
    "limitations",          # 12. najczestsze ograniczenia
    "dependencies",         # 13. zaleznosci z innymi uslugami
    "cross_domain_impact",  # 14. wplyw na pozostale domeny
    "modernization",        # 15. rekomendacje modernizacyjne
    "examples",             # 16. przykladowe wdrozenia
]

DOMAIN_PL = {
    "heating": "Ogrzewanie",
    "domestic_hot_water": "Ciepla woda uzytkowa",
    "cooling": "Chlodzenie",
    "ventilation": "Wentylacja",
    "lighting": "Oswietlenie",
    "dynamic_building_envelope": "Dynamiczna powloka budynku",
    "electricity": "Elektrycznosc",
    "electric_vehicle_charging": "Ladowanie pojazdow elektrycznych",
    "monitoring_and_control": "Monitorowanie i sterowanie",
}


def load_cat():
    with open(os.path.join(CAT, "services-authoritative.json"), encoding="utf-8") as f:
        return json.load(f)["services"]


def load_expert():
    merged = {}
    for mod in EXPERT_MODULES:
        m = importlib.import_module(mod)
        for code, data in m.EXPERT.items():
            if code in merged:
                raise SystemExit(f"Duplikat kodu w tresci eksperckiej: {code}")
            merged[code] = data
    return merged


def build():
    services = load_cat()
    expert = load_expert()

    errors = []
    by_domain = {}

    for s in services:
        code = s["official_code"]
        exp = expert.get(code)
        if exp is None:
            errors.append(f"{code}: BRAK karty eksperckiej")
            continue
        for k in EXPERT_REQUIRED:
            if k not in exp or exp[k] in (None, "", [], {}):
                errors.append(f"{code}: brak/puste pole eksperckie '{k}'")

        # poziomy funkcjonalnosci: scal oficjalny opis z praktycznym
        levels = []
        level_notes = exp.get("level_notes", {})
        for lv in s["functionality_levels"]:
            n = lv["level"]
            practical = level_notes.get(n) or level_notes.get(str(n))
            if not practical:
                errors.append(f"{code}: brak praktycznego opisu poziomu {n}")
            levels.append({
                "level": n,
                "official_description_en": lv["official_description_en"],
                "practical_description_pl": practical or "",
            })

        card = {
            # 1. oficjalna nazwa (katalog)
            "official_code": code,
            "internal_code": s.get("internal_code"),
            "domain_code": s["domain_code"],
            "service_group_en": s.get("service_group_en"),
            "official_name_en": s["official_name_en"],
            "official_name_pl": s.get("official_name_pl"),
            "included_in_method_a": s.get("included_in_method_a"),
            "fl_max": s.get("fl_max"),
            # 2-5.
            "friendly_name_pl": exp["friendly_name"],
            "purpose_pl": exp["purpose"],
            "technical_description_pl": exp["technical"],
            "energy_significance_pl": exp["energy_significance"],
            # 6.
            "functionality_levels": levels,
            # 7-16.
            "technologies": exp["technologies"],
            "devices": exp["devices"],
            "audit_verification": exp["audit_verification"],
            "evidence": exp["evidence"],
            "common_mistakes": exp["common_mistakes"],
            "limitations": exp["limitations"],
            "dependencies": exp["dependencies"],
            "cross_domain_impact": exp["cross_domain_impact"],
            "modernization": exp["modernization"],
            "examples": exp["examples"],
            "provenance": {
                "official_fields": "VERIFIED_ANNEX_D",
                "expert_fields": "EXPERT_AUTHORED",
                "source_version": "SRI calculation sheet v4.5",
            },
        }
        by_domain.setdefault(s["domain_code"], []).append(card)

    if errors:
        print("BLEDY KOMPLETNOSCI:")
        for e in errors:
            print("  -", e)
        print(f"\nRazem bledow: {len(errors)}")

    os.makedirs(OUT, exist_ok=True)
    index = {"total_services": 0, "domains": []}
    for dom, cards in by_domain.items():
        cards.sort(key=lambda c: c["official_code"])
        path = os.path.join(OUT, f"{dom}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "domain_code": dom,
                "domain_name_pl": DOMAIN_PL.get(dom, dom),
                "service_count": len(cards),
                "provenance": {"official_fields": "VERIFIED_ANNEX_D", "expert_fields": "EXPERT_AUTHORED"},
                "cards": cards,
            }, f, ensure_ascii=False, indent=2)
        index["domains"].append({"domain_code": dom, "domain_name_pl": DOMAIN_PL.get(dom, dom),
                                 "service_count": len(cards), "file": f"{dom}.json",
                                 "services": [c["official_code"] for c in cards]})
        index["total_services"] += len(cards)

    index["domains"].sort(key=lambda d: d["domain_code"])
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\nWygenerowano {index['total_services']}/54 kart w {len(by_domain)} domenach -> docs/sri/knowledge/")
    for d in index["domains"]:
        print(f"  {d['domain_code']:28} {d['service_count']:2} kart")
    return len(errors) == 0 and index["total_services"] == 54


if __name__ == "__main__":
    ok = build()
    print("\nSTATUS:", "✅ KOMPLETNE 54/54" if ok else "❌ NIEKOMPLETNE — uzupelnij braki")
