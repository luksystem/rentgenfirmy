# SRI — oficjalne źródła

Dokumentacja opiera się wyłącznie na źródłach prawnych i technicznych UE. Katalog usług Method B odpowiada **skonsolidowanemu Annex D** (54 usługi) z raportu technicznego DG ENER (czerwiec 2020), zgodnemu z **Delegated Regulation (EU) 2020/2155**.

## Prawo pierwotne i wtórne

| Dokument | ELI / numer | Rola |
|----------|-------------|------|
| Directive (EU) 2024/1275 (EPBD recast) | [32024L1275](https://eur-lex.europa.eu/eli/dir/2024/1275/oj) | Art. 15 — opcjonalny wspólny schemat SRI; od 2027 obowiązek dla dużych budynków nierezydencjonalnych (>290 kW HVAC); Annex IV — ogólny framework |
| Directive 2010/31/EU (EPBD) + amend. 2018/844 | Annex IA | Trzy kluczowe funkcjonalności smart readiness |
| Commission Delegated Regulation (EU) 2020/2155 | [32020R2155](https://eur-lex.europa.eu/eli/reg_del/2020/2155/oj) | Definicje, metodologia (Annex I), kryteria wpływu (II), wagi funkcjonalności (III), domeny (IV), wagi domen (V), katalog (VI), adaptacje (VII), klasy (VIII), certyfikat (IX) |
| Commission Implementing Regulation (EU) 2020/2156 | [32020R2156](https://eur-lex.europa.eu/eli/reg_impl/2020/2156/oj) | Modalności testowania i wdrożenia krajowego |

## Studia techniczne (framework unijny)

| Dokument | Opis |
|----------|------|
| *Final report on the technical support to the development of a smart readiness indicator for buildings* (VITO et al., DG ENER, czerwiec 2020) | [Publication detail](https://op.europa.eu/en/publication-detail/-/publication/f9e6d89d-fbb1-11ea-b44f-01aa75ed71a1) — Annex C (Method A, 27 usług), **Annex D (Method B, 54 usługi)**, macierze impact scores, wagi |
| *Summary of the technical support studies* (MJ0320413ENN) | Synteza metodologii, triage, normalizacja |
| EC — [Smart Readiness Indicator explained](https://energy.ec.europa.eu/topics/energy-efficiency/energy-performance-buildings/smart-readiness-indicator/smart-readiness-indicator-explained_en) | Pakiet oceny SRI (Excel + practical guide) na żądanie |

## Standardy techniczne (mapowanie usług)

| Standard | Rola |
|----------|------|
| EN ISO 52120-1:2022 (następca EN 15232) | Klasy BACS A–D; większość usług HVAC/wentylacji/oświetlenia |
| EN ISO 52000-1 | Wskaźniki dopasowania do sieci (perspektywa ilościowa) |

## Wersja metodologii przyjęta w Rentgen

| Pole | Wartość |
|------|---------|
| `methodology_version` | `eu-2020-2155-v1` |
| `catalogue_id` | `eu-method-b-2020-consolidated` |
| `legal_basis` | Delegated Regulation (EU) 2020/2155 + EPBD 2024/1275 Art. 15 |
| `service_count` | 54 (Method B) |
| `impact_score_scale` | 0–3 (ordinal per impact criterion per functionality level) |

> **Uwaga:** Państwa członkowskie mogą publikować własne katalogi (Annex VI Reg. 2020/2155). Silnik wiedzy Rentgen przechowuje wersje katalogów; domyślnie ładujemy framework unijny Method B.
