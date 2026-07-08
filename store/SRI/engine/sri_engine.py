"""Silnik obliczeniowy SRI (Smart Readiness Indicator) zgodny z metodologia KE
(Delegated Regulation (EU) 2020/2155). Czysty Python, bez UI, tylko stdlib.

Metodologia (skrot):
  1. Dla kazdej domeny d i kryterium ic:
       achieved(d,ic) = suma impact score wybranych poziomow uslug w domenie
       maxposs(d,ic)  = suma impact score poziomow MAKS (FLmax) uslug w domenie
  2. Wynik per kryterium (renormalizacja wag domen nieobecnych / o zerowym maks):
       SR(ic) = sum_d W'(d,ic) * (achieved(d,ic) / maxposs(d,ic))
       gdzie W'(d,ic) = W(d,ic) znormalizowane po domenach realnie wnoszacych wklad
  3. Wynik calkowity:
       SRI = sum_ic W_f(ic) * SR(ic)          (W_f sumuje sie do 1)
  4. Wyniki 3 kluczowych funkcjonalnosci (dla raportu):
       SR(kf) = sum_{ic in kf} W_f(ic)*SR(ic) / sum_{ic in kf} W_f(ic)
  5. Klasa SRI wg progow procentowych (Annex VIII).
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "sri", "catalogue")

CRITERIA = [
    "energy_efficiency",
    "energy_flexibility_and_storage",
    "comfort",
    "convenience",
    "health_wellbeing_accessibility",
    "maintenance_and_fault_prediction",
    "information_to_occupants",
]

KEY_FUNCTIONALITIES = {
    "energy_performance_and_operation": ["energy_efficiency", "maintenance_and_fault_prediction"],
    "response_to_occupant_needs": ["comfort", "convenience", "health_wellbeing_accessibility", "information_to_occupants"],
    "energy_flexibility": ["energy_flexibility_and_storage"],
}

BUILDING_TYPES = ["residential", "non_residential"]
CLIMATE_ZONES = ["north_europe", "west_europe", "south_europe", "north_east_europe", "south_east_europe"]

TOL = 1e-9


def _load(*p):
    with open(os.path.join(BASE, *p), encoding="utf-8") as f:
        return json.load(f)


class Catalogue:
    """Wczytuje katalog v4.5 i udostepnia szybkie mapy do obliczen."""

    def __init__(self):
        services = _load("services-authoritative.json")["services"]
        scores = _load("impact-scores.json")["scores_by_service"]
        dom_w = _load("weights", "domain-impact-weights.json")["weights"]
        crit_w = _load("weights", "impact-criterion-weights.json")["weights"]
        bands = _load("class-bands.json")["bands"]

        self.service_domain = {}     # code -> domain_code
        self.service_flmax = {}      # code -> fl_max
        self.service_name = {}       # code -> en name
        self.level_scores = {}       # code -> {level -> {ic -> score}}
        self.max_scores = {}         # code -> {ic -> score at FLmax}
        for s in services:
            c = s["official_code"]
            self.service_domain[c] = s["domain_code"]
            self.service_flmax[c] = s["fl_max"]
            self.service_name[c] = s["official_name_en"]
        for code, rows in scores.items():
            by_level = {r["level"]: {ic: int(r["scores"].get(ic) or 0) for ic in CRITERIA} for r in rows}
            self.level_scores[code] = by_level
            flmax = self.service_flmax.get(code)
            self.max_scores[code] = by_level.get(flmax, {ic: 0 for ic in CRITERIA})

        # (bt, zone, domain, ic) -> weight
        self.domain_weight = {}
        for w in dom_w:
            self.domain_weight[(w["building_type"], w["climate_zone"], w["domain_code"], w["impact_criterion_code"])] = w["weight"]
        # (bt, ic) -> weight
        self.crit_weight = {}
        for w in crit_w:
            self.crit_weight[(w["building_type"], w["impact_criterion_code"])] = w["weight"]

        self.bands = sorted(bands, key=lambda b: b["class_number"])
        self.domains = sorted({s["domain_code"] for s in services})

    def classify(self, percent):
        for b in self.bands:
            lo, hi = b["score_min_percent"], b["score_max_percent"]
            if (percent >= lo and percent < hi) or (b["class_number"] == 1 and percent >= lo):
                return b["label"], b["class_number"]
        return None, None


def validate_assessment(cat, assessment):
    """Zwraca liste bledow walidacji (pusta = OK). Nie liczy nic."""
    errors = []
    bt = assessment.get("building_type")
    zone = assessment.get("climate_zone")
    svcs = assessment.get("services", {})

    if bt not in BUILDING_TYPES:
        errors.append(f"Nieprawidlowy building_type: {bt!r} (dozwolone: {BUILDING_TYPES})")
    if zone not in CLIMATE_ZONES:
        errors.append(f"Nieprawidlowa climate_zone: {zone!r} (dozwolone: {CLIMATE_ZONES})")
    if not isinstance(svcs, dict) or len(svcs) == 0:
        errors.append("Brak uslug w ocenie (services jest puste).")

    seen = set()
    for code, level in (svcs.items() if isinstance(svcs, dict) else []):
        if code in seen:
            errors.append(f"Zduplikowana usluga: {code}")
        seen.add(code)
        if code not in cat.service_domain:
            errors.append(f"Nieznany kod uslugi (brak w katalogu): {code}")
            continue
        if not isinstance(level, int) or isinstance(level, bool):
            errors.append(f"{code}: poziom musi byc liczba calkowita (jest {level!r})")
            continue
        flmax = cat.service_flmax[code]
        if level < 0:
            errors.append(f"{code}: poziom ujemny ({level}) niedozwolony")
        elif level > flmax:
            errors.append(f"{code}: poziom {level} przekracza FLmax={flmax}")
        elif level not in cat.level_scores.get(code, {}):
            errors.append(f"{code}: brak zdefiniowanych impact scores dla poziomu {level}")
    return errors


def compute_sri(cat, assessment):
    """Liczy pelny wynik SRI z pelnym sladem posrednim. Zaklada walidacje OK."""
    bt = assessment["building_type"]
    zone = assessment["climate_zone"]
    svcs = assessment["services"]

    # grupowanie uslug po domenach
    by_domain = {}
    for code, level in svcs.items():
        by_domain.setdefault(cat.service_domain[code], {})[code] = level

    present_domains = sorted(by_domain.keys())

    # --- slad per usluga ---
    service_trace = []
    for code, level in sorted(svcs.items()):
        sel = cat.level_scores[code][level]
        mx = cat.max_scores[code]
        service_trace.append({
            "code": code, "domain": cat.service_domain[code], "name": cat.service_name[code],
            "level": level, "fl_max": cat.service_flmax[code],
            "selected_scores": dict(sel), "max_scores": dict(mx),
        })

    # --- achieved / maxposs per (domena, kryterium) ---
    achieved = {}   # (d, ic) -> sum
    maxposs = {}    # (d, ic) -> sum
    for d, services in by_domain.items():
        for ic in CRITERIA:
            a = sum(cat.level_scores[c][lv][ic] for c, lv in services.items())
            m = sum(cat.max_scores[c][ic] for c in services)
            achieved[(d, ic)] = a
            maxposs[(d, ic)] = m

    # --- SR(ic) z renormalizacja wag domen ---
    sr_ic = {}
    ic_trace = {}
    for ic in CRITERIA:
        contributing = [d for d in present_domains if maxposs[(d, ic)] > 0]
        raw_w = {d: cat.domain_weight[(bt, zone, d, ic)] for d in contributing}
        total_w = sum(raw_w.values())
        norm_w = {d: (w / total_w if total_w > 0 else 0) for d, w in raw_w.items()}
        parts = []
        sr = 0.0
        for d in contributing:
            ratio = achieved[(d, ic)] / maxposs[(d, ic)]
            contrib = norm_w[d] * ratio
            sr += contrib
            parts.append({
                "domain": d, "achieved": achieved[(d, ic)], "maxposs": maxposs[(d, ic)],
                "ratio": ratio, "weight_raw": raw_w[d], "weight_norm": norm_w[d], "contribution": contrib,
            })
        sr_ic[ic] = sr
        ic_trace[ic] = {"contributing_domains": contributing, "weight_sum_raw": total_w, "parts": parts, "sr": sr}

    # --- SRI calkowity ---
    total = 0.0
    total_trace = []
    for ic in CRITERIA:
        wf = cat.crit_weight[(bt, ic)]
        term = wf * sr_ic[ic]
        total += term
        total_trace.append({"criterion": ic, "wf": wf, "sr": sr_ic[ic], "term": term})
    sri_percent = total * 100.0

    # --- wyniki kluczowych funkcjonalnosci ---
    kf_scores = {}
    for kf, ics in KEY_FUNCTIONALITIES.items():
        num = sum(cat.crit_weight[(bt, ic)] * sr_ic[ic] for ic in ics)
        den = sum(cat.crit_weight[(bt, ic)] for ic in ics)
        kf_scores[kf] = (num / den if den > 0 else 0.0)

    label, cls = cat.classify(sri_percent)

    return {
        "building_type": bt, "climate_zone": zone,
        "present_domains": present_domains,
        "service_trace": service_trace,
        "achieved": achieved, "maxposs": maxposs,
        "sr_ic": sr_ic, "ic_trace": ic_trace,
        "total_trace": total_trace,
        "sri_fraction": total, "sri_percent": sri_percent,
        "kf_scores": kf_scores,
        "class_label": label, "class_number": cls,
    }
