# AI-doradca i biblioteka metodologii

> Zależność: `ARCHITEKTURA.md` (D9, D14).

## 1. Zasada działania

Wzorzec identyczny z `lib/ai/service-estimate-generator.ts`: `fetch` do
`https://api.openai.com/v1/chat/completions`, `response_format: { type: "json_object" }`,
**bez streamingu**, **bez function calling**. Kontynuacja z OpenAI (D9) — bez limitu wywołań
na start (D9), bez dodatkowej zgody na wysyłanie opisu celu do API (decyzja produktowa, D9).

## 2. Endpoint

`POST /api/goals/ai/suggest`

```typescript
type GoalAiSuggestRequest = {
  description: string;
  trigger: "create" | "review";         // D9 — AI może sugerować też w trakcie trwania celu
  goalId?: string;                       // wymagane gdy trigger = "review"
  boardKind?: string;
  level?: "company" | "team" | "individual";
  context?: { projectId?: string; clientId?: string };
};
```

**Kontekst promptu:** system prompt zawiera całą **aktywną** bibliotekę metodologii
(`short_description`, `purpose`, `when_to_use`, `when_not_to_use` z `goal_methodologies`) —
AI wybiera tylko z zamkniętego, znanego zbioru (grounding, brak halucynacji nieistniejącego
kodu metodologii). Odpowiedź jest **walidowana** względem kodów w DB przed zapisem.

Gdy `trigger = "review"`, prompt dodatkowo zawiera aktualny stan celu (`progress_percent`,
historię ostatnich przeglądów, dni do końca okresu) — AI sugeruje korektę planu, a nie od nowa
metodologię.

## 3. Struktura odpowiedzi

```typescript
type GoalAiSuggestion = {
  recommendedMethodologyCode: string;
  justification: string;
  alternatives: Array<{ code: string; whenBetter: string }>;
  isTooVague: boolean;
  vagueWarningReason?: string;
  structure: {
    fields: Record<string, string>;          // wypełniony szablon wybranej metodologii
    kpis: Array<{ name: string; target: number; unit: string }>;
    monitoringApproach: string;
    reviewFrequency: "daily" | "weekly" | "monthly" | "quarterly";
    risks: string[];
    initiatives: string[];
    tasks: string[];
    resources: string[];
    budgetEstimate: { amount: number; currency: string; note: string };
  };
  // wypełniane tylko gdy trigger = "review"
  ongoingAdjustment?: {
    summary: string;
    recommendedActions: string[];
    statusSuggestion?: "on_track" | "at_risk" | "off_track";
  };
};
```

Każde wywołanie (zaakceptowane lub nie) zapisywane jest w `goal_ai_suggestions`
(`trigger`, `input_description`, `structure`, `accepted`) — audyt trail. Zapis do `goals` /
`goal_kpis` / `goal_initiatives` następuje **wyłącznie po akceptacji/edycji przez użytkownika**
w wizardzie (nic nie jest zapisywane automatycznie).

## 4. Biblioteka metodologii — zawartość startowa

Seed 9 metodologii do `goal_methodologies` (migracja Fazy 4). Każda karta: opis, przeznaczenie,
kiedy stosować / kiedy nie, struktura, przykład, dobre praktyki, najczęstsze błędy,
`field_schema` (szablon pól formularza tworzenia celu).

| Kod | Nazwa | `field_schema` (przykład) |
|---|---|---|
| `smart` | SMART | `specific`, `measurable`, `achievable`, `relevant`, `timeBound` |
| `okr` | OKR | `objective` (text) + `keyResults[]` (`description`, `targetValue`, `currentValue`, `unit`) |
| `woop` | WOOP | `wish`, `outcome`, `obstacle`, `plan` |
| `bhag` | BHAG | `visionStatement`, `timeHorizonYears`, `successCriteria` |
| `eos_rocks` | EOS Rocks | `rockTitle`, `who`, `whatDoneLooksLike`, `quarter` |
| `kpi` | KPI | `kpiName`, `formula`, `targetValue`, `frequency` |
| `pdca` | PDCA | `plan`, `do`, `check`, `act` |
| `kaizen` | Kaizen | `currentState`, `problem`, `smallImprovement`, `measurementMethod` |
| `12wy` | 12 Week Year | `visionOutcome`, `weeklyTactics[]`, `scorecardMetric` |

**PDCA i moduł Problemów:** `plan/do/check/act` mapuje się na docelowy cykl
Problem → Analiza → Rozwiązanie → Sprawdzenie skuteczności → Aktualizacja standardu.
Gdy powstanie moduł Problemów, problem będzie mógł zostać „podniesiony” do celu typu PDCA
z automatycznym wstępnym wypełnieniem pól (poza zakresem tego wdrożenia — patrz
`goal_links.linked_type = 'problem'` w `ARCHITEKTURA.md`).

## 5. Dodawanie kolejnych metodologii

Insert do `goal_methodologies` (docelowo z panelu administratora — poza zakresem MVP, D12).
Brak zmian w kodzie aplikacji wymaganych do dodania nowej metodologii — jedynie do zmiany
logiki promptu, jeśli nowa metodologia wymaga specyficznego traktowania w AI (rzadkie, bo prompt
jest generyczny i czyta cały katalog).
