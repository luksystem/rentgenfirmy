# REPORT_COMPONENT_ARCHITECTURE — architektura komponentów raportu i ankiety

> Frontend prezentacyjny. **Zero logiki SRI w kliencie** — komponenty przyjmują gotowe dane.

## Warstwy

```
Server (Node)                         Client (React)
─────────────                         ──────────────
lib/sri/report-view.ts   ──model──▶   components/audit/report/report-view.tsx
  buildReportViewModel()               ├─ ReportTitle
  buildPotential()  (silnik SRI)       ├─ ReportExecutiveSummary
  buildStagePredictions()              ├─ ScoreGauge (recharts RadialBar + licznik)
lib/audit/report-visibility.ts         ├─ DomainRadar (recharts Radar)
  toPublicReport(model, visibility)    ├─ CriteriaBars (recharts BarChart poziomy)
                                       ├─ CurrentVsPotential (recharts Bar)
                                       ├─ RecommendationsTable
                                       ├─ RoadmapTimeline
                                       ├─ TechnicalDetails (accordion)
                                       └─ Attachments
```

## Komponenty prezentacyjne (props = dane, bez fetchy w środku)

| Komponent | Wejście | Uwagi |
|---|---|---|
| `ReportView` | `ReportViewModel` + `mode` (`screen`\|`print`) + `visibility?` | kontener sekcji |
| `ScoreGauge` | `current`, `potential`, `classLabel` | animowany licznik |
| `DomainRadar` | `domains[]` | radar; mobile → `CriteriaBars` fallback |
| `CriteriaBars` | `criteria[]` | poziome słupki current vs potential |
| `CurrentVsPotential` | `current`, `potential` | „gdzie jesteś / po modernizacji" |
| `RecommendationsTable` | `recommendations[]` | karty (mobile) / tabela (desktop) |
| `RoadmapTimeline` | `roadmap[]` | etapy + przewidywany wynik |
| `useCountUp` | `value` | hook animacji licznika (respektuje reduced-motion) |
| `usePdfExport` | ref widoku | html2canvas + jspdf |

## Ankieta

| Komponent | Rola |
|---|---|
| `AuditSurvey` | krokowy kontener (domeny), pasek postępu, autosave, nawigacja |
| `SurveyStepDomain` | lista pytań domeny |
| `SurveyQuestion` | pojedyncze pytanie: wybór poziomu, status, notatka, evidence, pomoc |
| `useAutosave` | debounce + kolejka offline + stan „Zapisano/Zapisywanie" |

## Współdzielenie

- `ReportView` używany w 3 miejscach: `/audyt/[id]/raport` (właściciel), `/audyt/przyklad`
  (podgląd referencyjny), `/public/report/[token]` (po filtrze `toPublicReport`).
- Ten sam model → spójna prezentacja; różni się jedynie zestaw sekcji (visibility) i tryb.

## Dane / API

- `GET /api/audit/{id}/report` → `ReportViewModel` (właściciel).
- `GET /api/audit/{id}/share` / `PUT` / `POST regenerate` / `DELETE` → zarządzanie linkiem.
- Publiczne: `POST /api/public/report/{token}/verify` (hasło → cookie),
  strona `/public/report/{token}` renderuje server-side po weryfikacji (bez public API do danych).

## Wydajność

- Wykresy lazy (`dynamic(() => import(...), { ssr:false })`) na stronie ekranowej.
- `ResponsiveContainer` + memoizacja danych wykresów.
- PDF generowany na żądanie (przycisk), nie przy renderze.
