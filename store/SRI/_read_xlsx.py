"""Samowystarczalny czytnik .xlsx (tylko stdlib) do analizy struktury SRI.
Nic nie instaluje. Uruchomienie:
  python _read_xlsx.py structure                 -> lista zakladek + wymiary
  python _read_xlsx.py sheet "<nazwa>" [rows]    -> pierwsze wiersze zakladki
"""
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
        text = "".join(t.text or "" for t in si.iter("{%s}t" % NS["main"]))
        strings.append(text)
    return strings


def get_sheets(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {}
    for rel in rels.findall("pr:Relationship", NS):
        rid_to_target[rel.get("Id")] = rel.get("Target")
    sheets = []
    for sh in wb.find("main:sheets", NS).findall("main:sheet", NS):
        name = sh.get("name")
        rid = sh.get("{%s}id" % NS["r"])
        target = rid_to_target.get(rid, "")
        if target and not target.startswith("/"):
            target = "xl/" + target
        else:
            target = target.lstrip("/")
        sheets.append((name, target))
    return sheets


def cell_value(c, shared):
    t = c.get("t")
    v = c.find("main:v", NS)
    if t == "s":
        if v is None or v.text is None:
            return ""
        return shared[int(v.text)]
    if t == "inlineStr":
        is_el = c.find("main:is", NS)
        if is_el is not None:
            return "".join(x.text or "" for x in is_el.iter("{%s}t" % NS["main"]))
        return ""
    if v is None:
        return ""
    return v.text or ""


def read_rows(z, target, shared, max_rows=None):
    data = z.read(target)
    root = ET.fromstring(data)
    sd = root.find("main:sheetData", NS)
    rows = []
    for r in sd.findall("main:row", NS):
        cells = {}
        maxc = -1
        for c in r.findall("main:c", NS):
            ref = c.get("r", "")
            ci = col_to_idx(ref)
            cells[ci] = cell_value(c, shared)
            maxc = max(maxc, ci)
        row = [cells.get(i, "") for i in range(maxc + 1)]
        rows.append(row)
        if max_rows and len(rows) >= max_rows:
            break
    return rows


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "structure"
    with zipfile.ZipFile(PATH) as z:
        shared = load_shared_strings(z)
        sheets = get_sheets(z)
        if mode == "structure":
            print("SHARED_STRINGS:", len(shared))
            print("SHEETS:", len(sheets))
            for name, target in sheets:
                try:
                    rows = read_rows(z, target, shared)
                    ncols = max((len(r) for r in rows), default=0)
                    print(f"- [{name}] rows={len(rows)} cols={ncols} file={target}")
                except Exception as e:
                    print(f"- [{name}] ERROR {e} file={target}")
        elif mode == "sheet":
            wanted = sys.argv[2]
            nrows = int(sys.argv[3]) if len(sys.argv) > 3 else 25
            target = dict(sheets).get(wanted)
            if not target:
                print("NOT FOUND:", wanted)
                return
            rows = read_rows(z, target, shared, max_rows=nrows)
            for i, row in enumerate(rows):
                cells = " | ".join(
                    f"{chr(65 + j) if j < 26 else 'A' + chr(65 + j - 26)}:{v}"
                    for j, v in enumerate(row)
                    if str(v).strip() != ""
                )
                print(f"R{i+1}: {cells}")


if __name__ == "__main__":
    main()
