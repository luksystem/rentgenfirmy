"""Ekstraktor danych SRI z oficjalnego arkusza KE v4.5 -> surowe JSON.
Tylko stdlib. Wierny zrzut (bez interpretacji). Uruchomienie:
  python _extract.py            -> zapisuje raw/*.json
"""
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
}
PATH = "SRI_calculation-sheet_v4.5.xlsx"
OUT = "raw"


def col_to_idx(cell_ref):
    letters = "".join(c for c in cell_ref if c.isalpha())
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch.upper()) - ord("A") + 1)
    return idx - 1


def load_shared_strings(z):
    strings = []
    try:
        data = z.read("xl/sharedStrings.xml")
    except KeyError:
        return strings
    root = ET.fromstring(data)
    for si in root.findall("main:si", NS):
        strings.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["main"])))
    return strings


def get_sheets(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {rel.get("Id"): rel.get("Target") for rel in rels.findall("pr:Relationship", NS)}
    sheets = {}
    for sh in wb.find("main:sheets", NS).findall("main:sheet", NS):
        target = rid_to_target.get(sh.get("{%s}id" % NS["r"]), "")
        target = ("xl/" + target) if target and not target.startswith("/") else target.lstrip("/")
        sheets[sh.get("name")] = target
    return sheets


def cell_value(c, shared):
    t = c.get("t")
    v = c.find("main:v", NS)
    if t == "s":
        return shared[int(v.text)] if v is not None and v.text is not None else ""
    if t == "inlineStr":
        is_el = c.find("main:is", NS)
        return "".join(x.text or "" for x in is_el.iter("{%s}t" % NS["main"])) if is_el is not None else ""
    return (v.text or "") if v is not None else ""


def read_rows(z, target, shared):
    root = ET.fromstring(z.read(target))
    sd = root.find("main:sheetData", NS)
    rows = []
    for r in sd.findall("main:row", NS):
        cells, maxc = {}, -1
        for c in r.findall("main:c", NS):
            ci = col_to_idx(c.get("r", ""))
            cells[ci] = cell_value(c, shared)
            maxc = max(maxc, ci)
        rows.append([cells.get(i, "") for i in range(maxc + 1)])
    return rows


def num(x):
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s == "-":
        return None
    try:
        return float(s)
    except ValueError:
        return None


IMPACT_CRITERIA = [
    "energy_efficiency",
    "energy_flexibility_and_storage",
    "comfort",
    "convenience",
    "health_wellbeing_accessibility",
    "maintenance_and_fault_prediction",
    "information_to_occupants",
]

DOMAIN_CODE_BY_NAME = {
    "Heating": "H",
    "Domestic hot water": "DHW",
    "Cooling": "C",
    "Ventilation": "V",
    "Lighting": "L",
    "Electricity": "E",
    "Dynamic building envelope": "DE",
    "Electric vehicle charging": "EV",
    "Monitoring and control": "MC",
}


def extract_services(rows):
    """overview_of_services -> lista uslug z kolumnami A..Q."""
    services = []
    for r in rows[3:]:  # dane od R4
        if len(r) < 2:
            continue
        domain = str(r[0]).strip() if len(r) > 0 else ""
        code = str(r[1]).strip() if len(r) > 1 else ""
        if not code or not re.match(r"^[A-Za-z]+-", code):
            continue
        def g(i):
            return str(r[i]).strip() if len(r) > i else ""
        services.append({
            "domain_name": domain,
            "official_code": code,
            "service_group": g(2),
            "service_name": g(3),
            "fl_descriptions": [g(4), g(5), g(6), g(7), g(8)],
            "method_a": num(g(9)),
            "method_b": num(g(10)),
            "custom_list": num(g(11)),
            "preconditions": g(12),
            "triage": num(g(13)),
            "domain_code": g(14),
        })
    return services


def _cell(r, i):
    return str(r[i]).strip() if len(r) > i else ""


def extract_domain_matrix(rows):
    """Zakladka domeny -> macierze impact scores per usluga (kolumny E..K = 7 kryteriow).

    Niezawodny marker bloku uslugi: wiersz-separator C=="code", D=="service".
    Wiersz nastepny zawiera kod (C) i nazwe (D). Dalej wiersze "level N" ze scorami E..K.
    (Marker wizualny "\u25ba" w kol. B wystepuje tylko przy czesci uslug -> nie uzywac.)
    """
    services = []
    current = None
    for i, r in enumerate(rows):
        c = _cell(r, 2)
        d = _cell(r, 3)
        # separator -> nastepny wiersz to naglowek uslugi
        if c.lower() == "code" and d.lower() == "service":
            if current:
                services.append(current)
            current = None
            nxt = rows[i + 1] if i + 1 < len(rows) else []
            code = _cell(nxt, 2)
            name = _cell(nxt, 3)
            group = _cell(nxt, 6)
            if code and re.match(r"^[A-Za-z]+-", code):
                current = {
                    "official_code": code,
                    "service_name": name,
                    "service_group": group,
                    "applicable_flag": num(_cell(r, 4)),
                    "levels": [],
                }
            continue
        if current is not None and c.lower().startswith("level "):
            try:
                level_no = int(c.split()[1])
            except (IndexError, ValueError):
                continue
            # Po pierwszej pelnej serii 0..N bywa druga, uszkodzona (opis "#REF!").
            # Gdy numer poziomu przestaje rosnac -> koniec realnej macierzy; ignoruj reszte.
            if current["levels"] and level_no <= current["levels"][-1]["level"]:
                current["_closed"] = True
            if current.get("_closed") or d.strip() == "#REF!":
                continue
            scores = {}
            for k, crit in enumerate(IMPACT_CRITERIA):
                col = 4 + k  # E..K
                scores[crit] = num(r[col]) if len(r) > col else None
            current["levels"].append({
                "level": level_no,
                "description": d,
                "scores": scores,
            })
    if current:
        services.append(current)
    for s in services:
        s.pop("_closed", None)
    return services


# Strefy klimatyczne: (nazwa, kolumna_z_nazwa_domeny, pierwsza_kolumna_wag)
CLIMATE_ZONES = [
    ("north_europe", 0, 1),
    ("west_europe", 10, 11),
    ("south_europe", 20, 21),
    ("north_east_europe", 29, 30),
    ("south_east_europe", 38, 45 - 6),  # AN=39
]
# Korekta: AN=39
CLIMATE_ZONES = [
    ("north_europe", 0, 1),
    ("west_europe", 10, 11),
    ("south_europe", 20, 21),
    ("north_east_europe", 29, 30),
    ("south_east_europe", 38, 39),
]


def extract_weights(rows):
    """Weightings -> DEFAULT WEIGHTING FACTORS: wagi domen W(d,ic) i wag kryteriow W_f(ic).

    Zwraca dict: building_type -> {domain_weights: {...}, impact_weights: {...}}.
    building_type ustalany po markerach 'residential' / 'non-residential' w kol. A.
    """
    result = {}
    current_bt = None
    section = None  # 'domain' | 'impact'
    for i, r in enumerate(rows):
        a = _cell(r, 0)
        al = a.lower()
        if al in ("residential", "non-residential"):
            current_bt = al
            result.setdefault(current_bt, {"domain_weights": {}, "impact_weights": {}})
            section = None
            continue
        if current_bt is None:
            continue
        if a.upper() == "DOMAIN WEIGHTINGS":
            section = "domain"
            continue
        if a.upper() == "IMPACT WEIGHTINGS":
            section = "impact"
            continue
        # wiersz domeny w sekcji domain
        if section == "domain" and a in DOMAIN_CODE_BY_NAME:
            dcode = DOMAIN_CODE_BY_NAME[a]
            for zone, name_col, w0 in CLIMATE_ZONES:
                # potwierdz, ze nazwa domeny zgadza sie w kolumnie strefy (jesli obecna)
                zname = _cell(r, name_col)
                if zname and zname not in DOMAIN_CODE_BY_NAME:
                    continue
                crit_vals = {}
                for k, crit in enumerate(IMPACT_CRITERIA):
                    crit_vals[crit] = num(r[w0 + k]) if len(r) > (w0 + k) else None
                result[current_bt]["domain_weights"].setdefault(zone, {})[dcode] = crit_vals
        # wiersz wag kryteriow (pierwszy wiersz liczbowy po naglowku IMPACT WEIGHTINGS)
        if section == "impact" and not result[current_bt]["impact_weights"]:
            # pomijaj wiersz naglowkowy z nazwami kryteriow
            first = _cell(r, 1)
            if num(first) is not None:
                iw = {}
                for k, crit in enumerate(IMPACT_CRITERIA):
                    iw[crit] = num(r[1 + k]) if len(r) > (1 + k) else None
                result[current_bt]["impact_weights"] = iw
                section = None
    return result


def main():
    os.makedirs(OUT, exist_ok=True)
    with zipfile.ZipFile(PATH) as z:
        shared = load_shared_strings(z)
        sheets = get_sheets(z)

        # 1. Uslugi
        rows = read_rows(z, sheets["overview_of_services"], shared)
        services = extract_services(rows)
        with open(os.path.join(OUT, "services.json"), "w", encoding="utf-8") as f:
            json.dump(services, f, ensure_ascii=False, indent=2)
        method_b = [s for s in services if s.get("method_b") == 1]
        method_a = [s for s in services if s.get("method_a") == 1]
        print(f"services: total_rows={len(services)} method_b={len(method_b)} method_a={len(method_a)}")

        # 2. Macierze impact per domena
        domain_sheets = ["H", "DHW", "C", "V", "L", "DE", "E", "EV", "MC"]
        all_matrices = {}
        for ds in domain_sheets:
            if ds not in sheets:
                print(f"WARN: brak zakladki domeny {ds}")
                continue
            drows = read_rows(z, sheets[ds], shared)
            svc = extract_domain_matrix(drows)
            all_matrices[ds] = svc
            print(f"domain {ds}: services_with_matrix={len(svc)}")
        with open(os.path.join(OUT, "impact-matrices.json"), "w", encoding="utf-8") as f:
            json.dump(all_matrices, f, ensure_ascii=False, indent=2)

        # 3. Wagi
        wrows = read_rows(z, sheets["Weightings"], shared)
        weights = extract_weights(wrows)
        with open(os.path.join(OUT, "weights.json"), "w", encoding="utf-8") as f:
            json.dump(weights, f, ensure_ascii=False, indent=2)
        for bt, data in weights.items():
            zones = data["domain_weights"]
            print(f"weights[{bt}]: zones={list(zones.keys())} impact_w={'set' if data['impact_weights'] else 'MISSING'}")


if __name__ == "__main__":
    main()
