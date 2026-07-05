# Smart Readiness Indicator (SRI) — silnik wiedzy Rentgen

Moduł oceny inteligencji budynku zgodnie z metodologią Komisji Europejskiej.

**Status:** `NOT_READY_FOR_SCORING` — warstwa normatywna odwzorowana z prawa UE; rdzeń liczbowy (impact scores, wagi) zablokowany brakiem oficjalnego pakietu Excel KE. Bez UI, API ani kodu aplikacji.

## Dokumenty

| Plik | Zawartość |
|------|-----------|
| [SRI-KNOWLEDGE-BASE-STATUS.md](./SRI-KNOWLEDGE-BASE-STATUS.md) | **Przegląd stanu** — co gotowe, czego brak, gotowość do audytu |
| [VALIDATION-GAP-PLAN.md](./VALIDATION-GAP-PLAN.md) | Plan walidacji, luki, blokady, kryteria gotowości |
| [IMPORT-MAPPING.md](./IMPORT-MAPPING.md) | Mapowanie Annex D / Excel → model danych |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Pełna architektura: encje, relacje, scoring, wersjonowanie |
| [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) | Propozycja schematu SQL (referencyjna, niezaimplementowana) |
| [SOURCES.md](./SOURCES.md) | Oficjalne źródła prawne i techniczne |
| [catalogue/method-b-services.json](./catalogue/method-b-services.json) | Katalog 54 usług Method B — ⚠️ `RECONSTRUCTED`, `needs_verification` |
| [catalogue/domains.json](./catalogue/domains.json) | 9 domen technicznych (Annex IV) — VERIFIED |
| [catalogue/impact-criteria.json](./catalogue/impact-criteria.json) | 7 kryteriów wpływu (Annex II) — VERIFIED |

## Hierarchia pojęć (uproszczona)

```
MethodologyVersion
  └── Catalogue (Method A | Method B | national)
        └── TechnicalDomain (9)
              └── Service (27–54)
                    └── FunctionalityLevel (0–4)
                          └── ServiceImpactScore → ImpactCriterion (7)
```

## Następne kroki (poza tym etapem)

1. Import katalogu Method B z pełnymi macierzami impact scores (Annex D Excel — pakiet SRI EC).
2. Wersja krajowa PL (wagi klimatyczne, katalog MS).
3. Warstwa oceny budynku (instancje, triage, wynik SR).
4. UI i API w Rentgen.
