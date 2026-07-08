"""Testy spojnosci wyekstrahowanych danych SRI (IMPORT-MAPPING §4)."""
import json
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

CRITERIA = [
    "energy_efficiency",
    "energy_flexibility_and_storage",
    "comfort",
    "convenience",
    "health_wellbeing_accessibility",
    "maintenance_and_fault_prediction",
    "information_to_occupants",
]

EPS = 1e-6
ok = True


def check(label, cond):
    global ok
    status = "OK " if cond else "FAIL"
    if not cond:
        ok = False
    print(f"[{status}] {label}")


weights = json.load(open("raw/weights.json", encoding="utf-8"))
matrices = json.load(open("raw/impact-matrices.json", encoding="utf-8"))
services = json.load(open("raw/services.json", encoding="utf-8"))

print("=== TEST 1: suma wag domen per kryterium = 1 (kazdy building_type x strefa) ===")
for bt, data in weights.items():
    for zone, dweights in data["domain_weights"].items():
        for crit in CRITERIA:
            total = sum((dweights[d].get(crit) or 0.0) for d in dweights)
            # kryterium moze byc 0 dla wszystkich domen (dozwolone) -> wtedy suma 0
            near1 = abs(total - 1.0) < 1e-3
            near0 = abs(total) < 1e-9
            check(f"{bt}/{zone}/{crit}: Σ={total:.5f}", near1 or near0)

print("=== TEST 2: suma wag kryteriow W_f(ic) = 1 ===")
for bt, data in weights.items():
    iw = data["impact_weights"]
    total = sum((iw.get(c) or 0.0) for c in CRITERIA)
    check(f"{bt}: Σ W_f(ic) = {total:.5f}", abs(total - 1.0) < 1e-3)

print("=== TEST 3: kazda usluga Method B ma macierz z poziomami i FLmax>=1 ===")
mb = [s for s in services if s.get("method_b") == 1]
mat_by_code = {}
for v in matrices.values():
    for s in v:
        mat_by_code[s["official_code"]] = s
for s in mb:
    code = s["official_code"]
    m = mat_by_code.get(code)
    if not m:
        check(f"{code}: brak macierzy", False)
        continue
    real_levels = [lv for lv in m["levels"]
                   if not (str(lv["description"]).strip() in ("", "0")
                           and all(v in (None, 0) for v in lv["scores"].values()))]
    flmax = max((lv["level"] for lv in real_levels), default=-1)
    check(f"{code}: FLmax={flmax} (poziomow_realnych={len(real_levels)})", flmax >= 1)

print("=== TEST 4: skala scorow (min/max wystepujace) ===")
allvals = []
for v in matrices.values():
    for s in v:
        for lv in s["levels"]:
            for val in lv["scores"].values():
                if val is not None:
                    allvals.append(val)
print(f"    score min={min(allvals)} max={max(allvals)} (n={len(allvals)})")
print(f"    wartosci ujemne obecne: {any(v < 0 for v in allvals)}")

print()
print("WYNIK:", "WSZYSTKO OK" if ok else "SA BLEDY - patrz FAIL wyzej")
