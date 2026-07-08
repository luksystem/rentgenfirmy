# -*- coding: utf-8 -*-
"""Dzieli duzy seed SRI (jeden blok DO $$) na mniejsze, samodzielne pliki,
ktore zmieszcza sie w Supabase SQL Editor.

Kazdy plik czesciowy:
  - jest osobnym blokiem `do $$ ... end $$;`,
  - re-deklaruje v_mid/v_cat i wykonuje te sama preambule (guard),
  - zawiera podzbior instrukcji INSERT.

Seed jest idempotentny (uuid5 + ON CONFLICT DO NOTHING), wiec podzial i
ewentualne powtorne uruchomienie sa bezpieczne. Kolejnosc czesci ma znaczenie
(najpierw uslugi i poziomy FL, potem punkty/wagi) — uruchamiaj po kolei.

Uruchomienie: python store/sri/_split_seed.py [linie_na_czesc]
"""

import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "supabase", "seed", "096_sri_catalogue_seed.sql")
OUTDIR = os.path.join(ROOT, "supabase", "seed", "096_chunks")
LINES_PER_CHUNK = int(sys.argv[1]) if len(sys.argv) > 1 else 700


def main():
    with open(SRC, encoding="utf-8") as fh:
        lines = fh.read().split("\n")

    def find(pred, start=0):
        for i in range(start, len(lines)):
            if pred(lines[i]):
                return i
        raise RuntimeError("nie znaleziono markera w seedzie")

    do_idx = find(lambda l: l.strip() == "do $$")
    guard_end_idx = find(lambda l: l.strip() == "end if;", do_idx)
    footer_idx = find(lambda l: l.strip() == "end $$;", guard_end_idx)
    first_insert_idx = find(lambda l: l.strip().startswith("insert into"), guard_end_idx)

    header = "\n".join(lines[do_idx:guard_end_idx + 1])  # do $$ ... end if;
    body = lines[first_insert_idx:footer_idx]
    # usun puste linie na koncu body
    while body and body[-1].strip() == "":
        body.pop()

    # Podzial TYLKO na bezpiecznych granicach, aby nie rozdzielic bloku jednej
    # uslugi (usluga + jej FL + scores musza byc w jednej czesci — FK + transakcja
    # bloku do $$). Bezpieczny poczatek nowej czesci to:
    #  - nowy blok uslugi (insert into public.sri_services),
    #  - wiersze wag (samodzielne, zaleza tylko od v_mid + danych z migracji).
    safe_starts = (
        "insert into public.sri_services",
        "insert into public.sri_impact_criterion_weights",
        "insert into public.sri_domain_impact_weights",
    )
    chunks = []
    cur = []
    for line in body:
        stripped = line.lstrip()
        is_safe_boundary = any(stripped.startswith(s) for s in safe_starts)
        if cur and len(cur) >= LINES_PER_CHUNK and is_safe_boundary:
            chunks.append(cur)
            cur = []
        cur.append(line)
    if cur:
        chunks.append(cur)

    os.makedirs(OUTDIR, exist_ok=True)
    # wyczysc stare czesci
    for f in os.listdir(OUTDIR):
        if f.endswith(".sql"):
            os.remove(os.path.join(OUTDIR, f))

    total = len(chunks)
    for i, chunk in enumerate(chunks, 1):
        fname = f"096_part_{i:02d}_of_{total:02d}.sql"
        out = os.path.join(OUTDIR, fname)
        content = (
            f"-- SRI seed — czesc {i}/{total} (wygenerowana przez store/sri/_split_seed.py)\n"
            f"-- Uruchom PO migracji 096_sri_catalogue.sql, po kolei: 01, 02, ...\n"
            f"-- Idempotentny (ON CONFLICT DO NOTHING) — mozna uruchomic ponownie bezpiecznie.\n\n"
            + header + "\n\n"
            + "\n".join(chunk) + "\n\n"
            + "end $$;\n"
        )
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(content)
        size_kb = os.path.getsize(out) / 1024
        print(f"  {fname}  ({len(chunk)} linii, {size_kb:.0f} KB)")

    print(f"\nWygenerowano {total} czesci w supabase/seed/096_chunks/")
    print(f"Lacznie instrukcji w body: {sum(1 for l in body if l.strip().startswith('insert into'))}")


if __name__ == "__main__":
    main()
