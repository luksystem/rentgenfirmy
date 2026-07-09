# -*- coding: utf-8 -*-
"""Wspoldzielony, wersjo-swiadomy loader katalogu SRI.

Jedno zrodlo prawdy dla:
  - sciezki katalogu (domyslnie docs/sri/catalogue, ale mozna wskazac inna wersje),
  - wczytywania plikow JSON katalogu,
  - stalych metodologii (kryteria, kluczowe funkcjonalnosci, typy budynkow, strefy),
    ktore sa WYPROWADZANE z danych katalogu, a nie hardkodowane.

Cel architektoniczny (Architecture Review):
  Usuniecie duplikacji loaderow i zahardkodowanych stalych metodologii rozsianych po
  silniku i builderach. Dzieki temu obliczenia sa metodologicznie-neutralne i gotowe na
  wiele wersji (SRI EU v4.5, PL, przyszle) bez zmian w kodzie rdzenia.

Uzycie:
    repo = CatalogueRepository()                 # domyslna wersja (docs/sri/catalogue)
    repo = CatalogueRepository("/inna/wersja")   # inna wersja metodologii
    services = repo.load("services-authoritative.json")["services"]
    crit = repo.criteria()                        # kryteria wg sort_order
"""
import json
import os

DEFAULT_CATALOGUE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "sri", "catalogue")
)


class CatalogueRepository:
    """Wersjo-swiadomy dostep do plikow katalogu SRI i stalych metodologii."""

    def __init__(self, catalogue_dir=None):
        self.dir = os.path.abspath(catalogue_dir or DEFAULT_CATALOGUE_DIR)
        self._cache = {}

    # --- I/O -------------------------------------------------------------
    def path(self, *parts):
        return os.path.join(self.dir, *parts)

    def load(self, *parts):
        key = parts
        if key not in self._cache:
            with open(self.path(*parts), encoding="utf-8") as f:
                self._cache[key] = json.load(f)
        return self._cache[key]

    # --- Stale metodologii wyprowadzone z danych -------------------------
    def criteria(self):
        """Kody kryteriow oddzialywania wg oficjalnej kolejnosci (sort_order)."""
        ic = self.load("impact-criteria.json")
        return [c["code"] for c in sorted(ic, key=lambda x: x["sort_order"])]

    def key_functionalities(self):
        """Mapa: kluczowa funkcjonalnosc -> lista kryteriow (wyprowadzona z katalogu)."""
        ic = sorted(self.load("impact-criteria.json"), key=lambda x: x["sort_order"])
        kf_order = [
            k["code"]
            for k in sorted(
                self.load("key-functionalities.json")["key_functionalities"],
                key=lambda x: x["sort_order"],
            )
        ]
        grouped = {}
        for c in ic:
            grouped.setdefault(c["key_functionality_code"], []).append(c["code"])
        return {k: grouped[k] for k in kf_order if k in grouped}

    def building_types(self):
        return list(self.load("import-manifest.json")["building_types"])

    def climate_zones(self):
        return list(self.load("import-manifest.json")["climate_zones"])

    def source_version(self):
        return self.load("import-manifest.json").get("source_version")

    def source_checksum(self):
        return self.load("import-manifest.json").get("source_checksum")


def default_repository():
    return CatalogueRepository()
