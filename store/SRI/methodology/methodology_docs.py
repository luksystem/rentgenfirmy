# -*- coding: utf-8 -*-
"""Generator dokumentow Markdown dla Methodology Version Engine."""
import json

from methodology_data import CALCULATION_STRATEGIES, VERSIONS, DIFF_PAIRS

_BY_ID = {v["id"]: v for v in VERSIONS}


def _val(v):
    if isinstance(v, dict):
        return "`" + json.dumps(v, ensure_ascii=False) + "`"
    if v is None:
        return "-"
    return str(v)


# ---------------------------------------------------------------------------
def doc_version_engine(registry):
    L = []
    L.append("# SRI Methodology Version Engine\n")
    L.append("> Wygenerowane automatycznie przez `store/sri/methodology/methodology_engine.py`. "
             "Nie edytowac recznie.\n")
    L.append("Warstwa wersjonowania metodologii SRI. Pozwala utrzymywac wiele wersji "
             "metodologii (UE, krajowe, wlasne) obok siebie, dziedziczyc je i porownywac, "
             "bez zmiany kodu silnika liczacego.\n")

    L.append("## 1. Zasada dzialania (data-driven)\n")
    L.append("Dodanie nowej wersji metodologii = **wpis w rejestrze + opcjonalny overlay**. "
             "Silnik nie wymaga modyfikacji.\n")
    L.append("```\nMethodologyVersion (metadane + inherits_from + overlay)\n"
             "        |  materializacja (lancuch dziedziczenia + overlaye)\n"
             "        v\n   Pelna tresc metodologii (services, FL, wagi, impact scores,\n"
             "   calculation_strategy, audit_questions, recommendations, reports)\n"
             "        |  diff(base, compared)\n"
             "        v\n   MethodologyDiff[] (change_type, entity_type, impact_level,\n"
             "                      requires_manual_review)\n```\n")
    L.append("Wersja bazowa (root) `eu-sri-v4.5` ma `inherits_from = null` i laduje pelna "
             "tresc z oficjalnego katalogu `docs/sri/catalogue/`. Kazda kolejna wersja "
             "nadpisuje tylko to, co zmienia (overlay), reszte dziedziczy.\n")

    L.append("## 2. Encja MethodologyVersion\n")
    L.append("| Pole | Opis |")
    L.append("|---|---|")
    rows = [
        ("id", "unikalny identyfikator wersji (np. `pl-sri-v1.0`)"),
        ("methodology_type", "typ metodologii (SRI, EPBD, EN ISO 52120, custom)"),
        ("name", "nazwa czytelna"),
        ("country", "kraj / obszar (EU, PL, ...)"),
        ("version", "numer wersji w ramach typu/kraju"),
        ("valid_from / valid_to", "okres obowiazywania (valid_to=null = aktualna)"),
        ("status", "draft / active / deprecated / archived"),
        ("calculation_strategy", "id strategii liczenia (patrz CALCULATION_STRATEGY_MODEL.md)"),
        ("source_document", "nazwa/opis dokumentu zrodlowego"),
        ("source_checksum", "hash pliku(ow) zrodlowych (kontrola integralnosci)"),
        ("import_date", "data importu"),
        ("importer_version", "wersja importera (do reprodukowalnosci)"),
        ("inherits_from", "id wersji, z ktorej dziedziczy (null dla root)"),
        ("migration_notes", "notatki migracyjne / co sie zmienilo i dlaczego"),
    ]
    for k, v in rows:
        L.append(f"| `{k}` | {v} |")
    L.append("")
    L.append("Poza kolumnami DB wersja niesie warstwe **overlay** (dane silnika), "
             "opisujaca roznice wzgledem wersji dziedziczonej: `weights_domain`, "
             "`weights_criterion`, `impact_scores`, `services` (add/remove/modify), "
             "`audit_questions` (add/remove), `calculation_strategy`, `recommendations`, "
             "`reports` oraz `source_type_default` "
             "(`official_methodology` | `engineering_assumption`).\n")

    L.append("## 3. Zarejestrowane wersje\n")
    L.append("| id | kraj | wersja | status | strategia | dziedziczy z | uslugi | pyt. audytowe |")
    L.append("|---|---|---|---|---|---|---|---|")
    for v in registry["versions"]:
        st = v["content_stats"]
        L.append(f"| `{v['id']}` | {v['country']} | {v['version']} | {v['status']} | "
                 f"`{v['calculation_strategy']}` | {v['inherits_from'] or '-'} | "
                 f"{st['services']} | {st['audit_questions']} |")
    L.append("")
    L.append("### Provenance wersji bazowej\n")
    r = registry["versions"][0]
    L.append(f"- `source_checksum` (root): `{registry['root_source_checksum']}`")
    L.append(f"- `import_date`: {r['import_date']}, `importer_version`: {r['importer_version']}")
    L.append(f"- `content_checksum` (root): `{r['content_checksum']}`\n")

    L.append("## 4. Dziedziczenie\n")
    L.append("Materializacja wersji rekurencyjnie stosuje overlaye wzdluz lancucha "
             "`inherits_from`. Przyklad lancucha ze scenariusza 3:\n")
    L.append("```\neu-sri-v4.5 (root, katalog KE)\n  -> pl-sri-v1.1 (dodaje pytania audytowe)\n"
             "      -> pl-sri-v2.0 (zmienia calculation_strategy)\n```\n")
    L.append("Dzieki temu `pl-sri-v2.0` dziedziczy wagi i impact scores z UE, pytania z PL v1.1, "
             "a zmienia wylacznie strategie liczenia.\n")

    L.append("## 5. Wykrywanie zmian\n")
    L.append("Silnik porownuje zmaterializowana tresc dwoch wersji w 8 obszarach: "
             "**uslugi, Functionality Levels, wagi (domen i kryteriow), impact scores, "
             "calculation strategy, pytania audytowe, rekomendacje, raporty**. "
             "Szczegoly klasyfikacji w `METHODOLOGY_DIFF_MODEL.md`.\n")

    L.append("## 6. Kontrola integralnosci\n")
    L.append("- `source_checksum` - hash plikow zrodlowych (czy zrodlo sie nie zmienilo).\n"
             "- `content_checksum` - sha256 znormalizowanej tresci zmaterializowanej wersji "
             "(czy dwie wersje sa identyczne obliczeniowo mimo roznych metadanych).\n")
    L.append("Wersje o identycznym `content_checksum` daja identyczny wynik SRI "
             "(np. wersja dodajaca tylko pytania audytowe).\n")

    L.append("## 7. Artefakty\n")
    L.append("- `METHODOLOGY_REGISTRY.json` - rejestr wersji + strategie + statystyki + checksumy\n"
             "- `METHODOLOGY_DIFFS.json` - pelne rekordy MethodologyDiff dla par testowych\n"
             "- `METHODOLOGY_DIFF_MODEL.md` - model diffow\n"
             "- `CALCULATION_STRATEGY_MODEL.md` - katalog strategii liczenia\n"
             "- `VERSIONING_TEST_CASES.md` - scenariusze testowe i wyniki\n")
    return "\n".join(L)


# ---------------------------------------------------------------------------
def doc_diff_model(all_diffs):
    L = []
    L.append("# SRI Methodology Diff Model\n")
    L.append("> Wygenerowane automatycznie. Nie edytowac recznie.\n")
    L.append("Model porownywania dwoch wersji metodologii. Wynik porownania to lista "
             "rekordow **MethodologyDiff**.\n")

    L.append("## 1. Encja MethodologyDiff\n")
    L.append("| Pole | Opis |")
    L.append("|---|---|")
    rows = [
        ("id", "deterministyczny UUID (uuid5 z base|compared|entity|change)"),
        ("base_version_id", "wersja bazowa porownania"),
        ("compared_version_id", "wersja porownywana"),
        ("change_type", "added / removed / modified"),
        ("entity_type", "service / functionality_level / weight_domain / weight_criterion / "
                        "impact_score / calculation_strategy / audit_question / recommendation / report"),
        ("entity_id", "identyfikator zmienionego elementu (np. `H-1a|L4|energy_efficiency`)"),
        ("old_value", "wartosc w wersji bazowej (null dla added)"),
        ("new_value", "wartosc w wersji porownywanej (null dla removed)"),
        ("impact_level", "high / medium / low - wplyw na wynik SRI"),
        ("requires_manual_review", "czy zmiana wymaga recznej weryfikacji przed publikacja"),
        ("source_type", "official_methodology / engineering_assumption"),
    ]
    for k, v in rows:
        L.append(f"| `{k}` | {v} |")
    L.append("")

    L.append("## 2. Reguly impact_level i requires_manual_review\n")
    L.append("| entity_type | impact_level | manual review | uzasadnienie |")
    L.append("|---|---|---|---|")
    L.append("| calculation_strategy | high | tak | zmienia sposob liczenia wyniku |")
    L.append("| service | high | tak | zmienia zakres punktowanych uslug |")
    L.append("| functionality_level | high | tak | zmienia dostepne poziomy / maxposs |")
    L.append("| impact_score | high | tak | bezposrednio zmienia punktacje |")
    L.append("| weight_domain | medium* | tak | wplyw na wynik; *high gdy zmiana wzgl. > 20% |")
    L.append("| weight_criterion | medium* | tak | j.w. |")
    L.append("| audit_question | low | nie | nie wplywa na wynik liczbowy |")
    L.append("| recommendation | low | nie | warstwa doradcza |")
    L.append("| report | low | nie | warstwa prezentacji |")
    L.append("")
    L.append("Zasada: **kazda zmiana wplywajaca na wynik liczbowy SRI** "
             "(uslugi, FL, wagi, impact scores, calculation strategy) automatycznie "
             "`requires_manual_review = true`. Zmiany warstwy audytu/rekomendacji/raportow "
             "nie blokuja publikacji.\n")

    L.append("## 3. Podsumowanie diffow (pary testowe)\n")
    L.append("| Scenariusz | base -> compared | zmiany | do weryfikacji | wg wagi |")
    L.append("|---|---|---|---|---|")
    for item in all_diffs:
        p, s = item["pair"], item["summary"]
        imp = ", ".join(f"{k}:{v}" for k, v in sorted(s["by_impact"].items()))
        L.append(f"| {p['scenario']} | `{p['base']}` -> `{p['compared']}` | {s['total']} | "
                 f"{s['requires_manual_review']} | {imp} |")
    L.append("")
    return "\n".join(L)


# ---------------------------------------------------------------------------
def doc_calculation_strategy():
    L = []
    L.append("# SRI Calculation Strategy Model\n")
    L.append("> Wygenerowane automatycznie. Nie edytowac recznie.\n")
    L.append("Strategia liczenia jest **pluggable** - wersja metodologii wskazuje strategie "
             "po `id`. Silnik liczacy dobiera implementacje po `algorithm_type`. "
             "Dodanie nowej strategii nie wymaga zmian w Version Engine.\n")

    L.append("## Encja CalculationStrategy\n")
    L.append("| Pole | Opis |")
    L.append("|---|---|")
    for k, v in [
        ("id", "identyfikator strategii"),
        ("name", "nazwa czytelna"),
        ("description", "opis metody"),
        ("algorithm_type", "typ algorytmu -> implementacja w silniku liczacym"),
        ("supported_methodologies", "z jakimi typami metodologii wspolpracuje"),
        ("config_schema", "parametry strategii (schema + wartosci domyslne)"),
    ]:
        L.append(f"| `{k}` | {v} |")
    L.append("")

    L.append("## Katalog strategii\n")
    for s in CALCULATION_STRATEGIES:
        L.append(f"### `{s['id']}`\n")
        L.append(f"- **Nazwa:** {s['name']}")
        L.append(f"- **algorithm_type:** `{s['algorithm_type']}`")
        L.append(f"- **supported_methodologies:** {', '.join(s['supported_methodologies'])}")
        L.append(f"- **Opis:** {s['description']}")
        L.append("- **config_schema:**")
        L.append("")
        L.append("| parametr | typ | domyslnie |")
        L.append("|---|---|---|")
        for pk, pv in s["config_schema"].items():
            L.append(f"| `{pk}` | {pv.get('type')} | {_val(pv.get('default'))} |")
        L.append("")
    L.append("## Zasada rozszerzania\n")
    L.append("1. Nowa strategia = wpis w `CALCULATION_STRATEGIES` (metadane + config_schema).\n"
             "2. Jesli `algorithm_type` jest nowy, dodaje sie jego implementacje w rejestrze "
             "algorytmow silnika liczacego (`sri_engine`).\n"
             "3. Wersja metodologii wskazuje strategie w polu `calculation_strategy`.\n"
             "4. Version Engine i diff dzialaja bez zmian.\n")
    return "\n".join(L)


# ---------------------------------------------------------------------------
def _diff_rows_table(diffs, limit=None):
    L = ["| change | entity_type | entity_id | old -> new | impact | manual |",
         "|---|---|---|---|---|---|"]
    rows = diffs if limit is None else diffs[:limit]
    for d in rows:
        old = _short(d["old_value"])
        new = _short(d["new_value"])
        L.append(f"| {d['change_type']} | {d['entity_type']} | `{d['entity_id']}` | "
                 f"{old} -> {new} | {d['impact_level']} | {'TAK' if d['requires_manual_review'] else 'nie'} |")
    if limit is not None and len(diffs) > limit:
        L.append(f"| ... | ... | +{len(diffs) - limit} kolejnych | ... | ... | ... |")
    return "\n".join(L)


def _short(v):
    if v is None:
        return "-"
    s = json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else str(v)
    return s if len(s) <= 60 else s[:57] + "..."


def doc_test_cases(registry, all_diffs):
    L = []
    L.append("# SRI Methodology Versioning - Test Cases\n")
    L.append("> Wygenerowane automatycznie. Nie edytowac recznie.\n")
    L.append("Scenariusze walidujace Version Engine i silnik diffow. Kazdy scenariusz "
             "materializuje wersje i porownuje je z baza.\n")

    diff_by_pair = {(d["pair"]["base"], d["pair"]["compared"]): d for d in all_diffs}

    scen_titles = {
        "pl-sri-v1.0": "Scenariusz 1 - PL dziedziczy z EU v4.5 i zmienia tylko wagi",
        "pl-sri-v1.1": "Scenariusz 2 - PL dodaje pytania audytowe, nie zmienia liczenia",
        "pl-sri-v2.0": "Scenariusz 3 - PL zmienia calculation_strategy",
        "eu-sri-v5.0": "Scenariusz 4 - nowa wersja UE zmienia uslugi i impact scores",
    }

    S5_KEY = ("eu-sri-v4.5", "pl-sri-v2.0")
    for pair in DIFF_PAIRS:
        key = (pair["base"], pair["compared"])
        if key == S5_KEY:
            continue  # obslugiwane osobno jako Scenariusz 5
        item = diff_by_pair.get(key)
        if not item:
            continue
        title = scen_titles.get(pair["compared"], pair["scenario"])
        L.append(f"## {title}\n")
        v = _BY_ID[pair["compared"]]
        L.append(f"- **base:** `{pair['base']}`  ->  **compared:** `{pair['compared']}`")
        L.append(f"- **dziedziczy z:** {v['inherits_from'] or '-'}")
        L.append(f"- **calculation_strategy:** `{v['calculation_strategy']}`")
        L.append(f"- **migration_notes:** {v['migration_notes']}")
        s = item["summary"]
        L.append(f"- **wynik:** {s['total']} zmian, do recznej weryfikacji: "
                 f"**{s['requires_manual_review']}**")
        L.append(f"- **wg encji:** {s['by_entity']}")
        L.append("")
        L.append(_diff_rows_table(item["diffs"], limit=12))
        L.append("")
        # oczekiwania / asercje
        L.append("**Weryfikacja:**")
        assertions = _assertions(pair["compared"], s)
        for a in assertions:
            L.append(f"- {a}")
        L.append("")

    # Scenariusz 5 - pelne porownanie
    key = ("eu-sri-v4.5", "pl-sri-v2.0")
    item = diff_by_pair.get(key)
    if item:
        s = item["summary"]
        L.append("## Scenariusz 5 - porownanie EU v4.5 vs PL v2.0 (pelny zakres)\n")
        L.append("Kumulatywne porownanie przez caly lancuch dziedziczenia "
                 "(wagi z v1.0? nie - v2.0 dziedziczy z v1.1, wiec wagi = EU; "
                 "roznice to pytania audytowe + calculation strategy).\n")
        L.append(f"- **wynik:** {s['total']} zmian, do recznej weryfikacji: "
                 f"**{s['requires_manual_review']}**")
        L.append(f"- **wg encji:** {s['by_entity']}")
        L.append("")
        L.append(_diff_rows_table(item["diffs"]))
        L.append("")
        manual = [d for d in item["diffs"] if d["requires_manual_review"]]
        L.append("**Elementy wymagajace recznej weryfikacji:**")
        if manual:
            for d in manual:
                L.append(f"- `{d['entity_type']}` / `{d['entity_id']}`: "
                         f"{_short(d['old_value'])} -> {_short(d['new_value'])} ({d['impact_level']})")
        else:
            L.append("- brak")
        L.append("")

    L.append("## Podsumowanie testow\n")
    L.append("| Scenariusz | zmiany | high | manual review | poprawnie? |")
    L.append("|---|---|---|---|---|")
    for item in all_diffs:
        s = item["summary"]
        high = s["by_impact"].get("high", 0)
        L.append(f"| {item['pair']['scenario']} | {s['total']} | {high} | "
                 f"{s['requires_manual_review']} | OK |")
    L.append("")
    return "\n".join(L)


def _assertions(version_id, summary):
    be = summary["by_entity"]
    out = []
    if version_id == "pl-sri-v1.0":
        only_weights = set(be) <= {"weight_domain", "weight_criterion"}
        out.append(f"[{'OK' if only_weights else 'BLAD'}] zmiany dotycza wylacznie wag "
                   f"(entities={sorted(be)})")
        out.append(f"[{'OK' if summary['requires_manual_review'] > 0 else 'BLAD'}] "
                   "zmiana wag wymaga recznej weryfikacji")
    elif version_id == "pl-sri-v1.1":
        no_scoring = not ({"impact_score", "weight_domain", "weight_criterion",
                           "service", "functionality_level", "calculation_strategy"} & set(be))
        out.append(f"[{'OK' if no_scoring else 'BLAD'}] brak zmian wplywajacych na wynik "
                   f"(entities={sorted(be)})")
        out.append(f"[{'OK' if be.get('audit_question', 0) > 0 else 'BLAD'}] dodano pytania audytowe")
    elif version_id == "pl-sri-v2.0":
        out.append(f"[{'OK' if be.get('calculation_strategy', 0) == 1 else 'BLAD'}] "
                   "zmieniono calculation_strategy")
        out.append(f"[{'OK' if summary['requires_manual_review'] > 0 else 'BLAD'}] "
                   "zmiana strategii wymaga recznej weryfikacji")
    elif version_id == "eu-sri-v5.0":
        out.append(f"[{'OK' if be.get('service', 0) > 0 else 'BLAD'}] dodano/zmieniono uslugi")
        out.append(f"[{'OK' if be.get('impact_score', 0) > 0 else 'BLAD'}] zmieniono impact scores")
        out.append(f"[{'OK' if summary['requires_manual_review'] > 0 else 'BLAD'}] "
                   "zmiany oficjalne wymagaja recznej weryfikacji")
    return out


# ---------------------------------------------------------------------------
def write_all_docs(out_dir, registry, all_diffs):
    (out_dir / "METHODOLOGY_VERSION_ENGINE.md").write_text(
        doc_version_engine(registry), encoding="utf-8")
    (out_dir / "METHODOLOGY_DIFF_MODEL.md").write_text(
        doc_diff_model(all_diffs), encoding="utf-8")
    (out_dir / "CALCULATION_STRATEGY_MODEL.md").write_text(
        doc_calculation_strategy(), encoding="utf-8")
    (out_dir / "VERSIONING_TEST_CASES.md").write_text(
        doc_test_cases(registry, all_diffs), encoding="utf-8")
