# Technical Debt Report

> Rejestr długu technicznego rdzenia Rentgen (SRI + Audit + Knowledge).
> Severity: Krytyczny (blokuje fundament) · Wysoki · Średni · Niski.
> Status: ✅ naprawione w tej sesji · ⏳ zaplanowane · ➖ zaakceptowane.

Siostrzane: `ARCHITECTURE_REVIEW.md`, `SCALABILITY_REVIEW.md`, `FINAL_CORE_ARCHITECTURE.md`.

---

## 1. Podsumowanie

| Severity | Pozycji | Naprawione teraz | Zaplanowane | Zaakceptowane |
|---|---|---|---|---|
| Krytyczny | 2 | 1 | 1 | 0 |
| Wysoki | 4 | 1 | 3 | 0 |
| Średni | 5 | 0 | 4 | 1 |
| Niski | 3 | 0 | 1 | 2 |

Żaden dług **nie blokuje** startu React+Supabase, pod warunkiem przyjęcia fundamentu z
`FINAL_CORE_ARCHITECTURE.md` (kontrakty danych + wersjonowanie artefaktów).

---

## 2. Rejestr długu

### D1 — Duplikacja loaderów katalogu  · Krytyczny · ✅ naprawione (rdzeń)
- **Gdzie:** `sri_engine`, `build_*`, `methodology_engine`, `_gen_seed_sql` (7 miejsc).
- **Problem:** 7 niezależnych sposobów wczytania katalogu, różne ścieżki, ryzyko rozjazdu.
- **Zrobione:** `store/SRI/_common/catalogue.py` (`CatalogueRepository`, wersjo-świadomy);
  rdzeń `sri_engine` przełączony; walidacja identyczna (PASS).
- **Reszta:** migracja builderów na wspólny loader — patrz D2.

### D2 — Buildery używają własnych loaderów/ścieżek  · Wysoki · ⏳ zaplanowane
- **Gdzie:** `build_dependencies`, `build_recommendations`, `build_knowledge`, `_gen_seed_sql`.
- **Problem:** wciąż lokalne `os.path` + własne `json.load`.
- **Remediacja:** zamienić na `CatalogueRepository`. Mechaniczne, po każdej zmianie re-run
  danego buildera (artefakty muszą wyjść identyczne).
- **Effort:** ~0.5 dnia. **Ryzyko:** niskie (weryfikowalne przez porównanie artefaktów).

### D3 — Zahardkodowane stałe metodologii  · Krytyczny → Wysoki · ✅ naprawione (rdzeń)
- **Gdzie:** `sri_engine` (naprawione), `_validate.py`, `_extract.py` (kopie).
- **Zrobione:** rdzeń wyprowadza `CRITERIA/KEY_FUNCTIONALITIES/BUILDING_TYPES/CLIMATE_ZONES`
  z katalogu.
- **Pozostałe:** `_validate.py`/`_extract.py` — skrypty importu jednorazowego (pre-katalog),
  operujące na `raw/`. Oznaczone jako ➖ zaakceptowane (patrz D11).

### D4 — Wersjonowanie nieprzewleczone przez artefakty  · Wysoki · ⏳ zaplanowane
- **Gdzie:** `docs/sri/dependency|recommendation|optimization/*.json`.
- **Problem:** artefakty nie mają `methodology_version_id` ani `source_checksum`; jedna wersja
  „na sztywno”. Nie da się trzymać EU v4.5 i PL v1.0 obok siebie.
- **Remediacja:** dodać nagłówek prowenansu do każdego artefaktu + layout
  `generated/<methodology_version_id>/...`. **Fundamentowe** (przed runtime).
- **Effort:** ~1 dzień.

### D5 — Ukryta kolejność buildów (brak orkiestratora)  · Wysoki · ⏳ zaplanowane
- **Gdzie:** pipeline `dependency → recommendation → optimization`.
- **Problem:** poprawność zależy od ręcznej kolejności; brak kontroli świeżości.
- **Remediacja:** `build_all.py` z jawnym DAG + checksum wejść (przelicz tylko nieaktualne).
- **Effort:** ~0.5 dnia.

### D6 — Most offline → runtime niezdefiniowany  · Krytyczny · ⏳ rozstrzygnięte projektowo
- **Problem:** brak kontraktu, jak grafy Python trafiają do runtime (Supabase/React).
- **Remediacja:** zdefiniowane w `FINAL_CORE_ARCHITECTURE.md` (artefakty → tabele read-model
  + `AssessmentInput` schema). Implementacja przy runtime.

### D7 — Ręczny split seeda (8 chunków)  · Wysoki → Średni · ⏳ zaplanowane
- **Gdzie:** `_split_seed.py`, `supabase/seed/096_chunks/*`.
- **Problem:** kopiuj-wklej do edytora SQL, ryzyko kolejności FK, nie skaluje na wiele wersji.
- **Remediacja:** seed przez Supabase CLI/migrację (transakcja), generowany z `generated/<v>/`.
- **Effort:** ~0.5 dnia.

### D8 — Powielone słowniki PL (domeny/kryteria)  · Średni · ⏳ zaplanowane
- **Gdzie:** `build_recommendations`, `build_optimization` (`DOMAIN_PL`, `CRITERION_PL`).
- **Remediacja:** jedno źródło tłumaczeń (spójne z `audit_i18n` / katalogiem `name_pl`).

### D9 — Dwa znaczenia „knowledge”  · Średni · ⏳ zaplanowane
- **Problem:** „Baza wiedzy” (runtime) vs „SRI knowledge cards” (offline) — kolizja nazw.
- **Remediacja:** przemianować w architekturze: `Company Knowledge Base` vs
  `SRI Service Knowledge`. Ujednolicić odwołania w dokumentach AI.

### D10 — FTS bez ścieżki na semantykę  · Średni · ⏳ zaplanowane (interfejs teraz)
- **Gdzie:** `lib/knowledge/search-query.ts`, `knowledge-search-server.ts`.
- **Problem:** OR-tsquery = słaby ranking przy wzroście; brak synonimów/parafraz.
- **Remediacja:** abstrakcja `KnowledgeSearch` (wymienna impl) → później hybrid FTS+pgvector.
  Interfejs zaprojektować teraz, implementację wektorów odłożyć.

### D11 — Ścieżki zależne od cwd w skryptach importu  · Niski · ➖ zaakceptowane
- **Gdzie:** `_validate.py`, `_extract.py` (`open("raw/...")`).
- **Uzasadnienie:** jednorazowe skrypty importu Excela (pre-katalog), nie część runtime.
  Oznaczyć w nagłówku „run from store/SRI”. Nie warte refaktoru.

### D12 — `docs/**` miesza raporty i kontrakty danych  · Niski → Średni · ⏳ zaplanowane
- **Problem:** te same pliki są dokumentacją i wejściem maszynowym.
- **Remediacja:** `docs/**` = raporty ludzkie; `generated/**` = kontrakty maszynowe wersjonowane.

### D13 — `_read_xlsx.py` / raw import ad-hoc  · Niski · ➖ zaakceptowane
- **Uzasadnienie:** narzędzie importu bez zależności zewnętrznych; spełniło rolę. Zostawić
  jako artefakt historyczny procesu importu (prowenans).

---

## 3. Plan spłaty (kolejność)

**Przed React+Supabase (fundamentowe):**
1. D4 — wersjonowanie artefaktów (`generated/<version>/` + prowenans).
2. D6 — kontrakty offline→runtime (przyjąć `FINAL_CORE_ARCHITECTURE.md`).
3. D7 — seed przez CLI/migracje.
4. Schemat `audit_*` z indeksami (S4 w Scalability).

**Wkrótce po (nieblokujące):**
5. D2, D5 — wspólny loader w builderach + orkiestrator DAG.
6. D8, D9, D12 — porządki nazewnicze i rozdział raporty/kontrakty.

**Kiedy potrzebne (rozwojowe):**
7. D10 — hybrid search (pgvector) za abstrakcją.

---

## 4. Zrobione w tej sesji

- ✅ `store/SRI/_common/catalogue.py` — wspólny, wersjo-świadomy loader.
- ✅ `sri_engine` — stałe metodologii wyprowadzane z katalogu (metodologicznie-neutralny rdzeń).
- ✅ Weryfikacja regresji: wyniki 5 scenariuszy identyczne, `STATUS OGOLNY: PASS`;
  buildery dependency/recommendation/optimization uruchomione bez błędów.
