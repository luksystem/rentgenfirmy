export const BUDGET_CONFIDENCE_LEVELS = ["ok", "high", "medium", "low", "frozen"] as const;
export type BudgetConfidenceLevel = (typeof BUDGET_CONFIDENCE_LEVELS)[number];

export const BUDGET_CONFIDENCE_LABELS: Record<BudgetConfidenceLevel, string> = {
  ok: "OK (pewne)",
  high: "Wysoka",
  medium: "Średnia",
  low: "Niska",
  frozen: "Zamrożone",
};

export function isBudgetConfidenceLevel(value: string): value is BudgetConfidenceLevel {
  return (BUDGET_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export const BUDGET_COST_CATEGORIES = [
  "biuro",
  "auto",
  "wynagrodzenia",
  "zus",
  "media",
  "podatki",
  "inne",
] as const;
export type BudgetCostCategory = (typeof BUDGET_COST_CATEGORIES)[number];

export const BUDGET_COST_CATEGORY_LABELS: Record<BudgetCostCategory, string> = {
  biuro: "Biuro",
  auto: "Auto",
  wynagrodzenia: "Wynagrodzenia",
  zus: "ZUS",
  media: "Media",
  podatki: "Podatki",
  inne: "Inne",
};

export function isBudgetCostCategory(value: string): value is BudgetCostCategory {
  return (BUDGET_COST_CATEGORIES as readonly string[]).includes(value);
}

export const BUDGET_COST_CADENCES = ["monthly", "every_n_months", "one_off"] as const;
export type BudgetCostCadence = (typeof BUDGET_COST_CADENCES)[number];

export const BUDGET_COST_CADENCE_LABELS: Record<BudgetCostCadence, string> = {
  monthly: "Co miesiąc",
  every_n_months: "Co N miesięcy",
  one_off: "Jednorazowo",
};

export function isBudgetCostCadence(value: string): value is BudgetCostCadence {
  return (BUDGET_COST_CADENCES as readonly string[]).includes(value);
}

export type ProjectRevenueForecast = {
  id: string;
  projectId: string;
  expectedMonth: string; // "YYYY-MM-01"
  amountGross: number;
  confidence: BudgetConfidenceLevel;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRevenueForecastInput = {
  projectId: string;
  expectedMonth: string;
  amountGross: number;
  confidence: BudgetConfidenceLevel;
  notes?: string;
};

export type ProjectRevenueForecastWithProject = ProjectRevenueForecast & {
  projectName: string;
  clientId: string | null;
};

export type BudgetCostItem = {
  id: string;
  name: string;
  category: BudgetCostCategory;
  amount: number;
  cadence: BudgetCostCadence;
  intervalMonths: number | null;
  month: string | null;
  startMonth: string;
  endMonth: string | null;
  isActive: boolean;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetCostItemInput = {
  name: string;
  category: BudgetCostCategory;
  amount: number;
  cadence: BudgetCostCadence;
  intervalMonths?: number | null;
  month?: string | null;
  startMonth?: string;
  endMonth?: string | null;
  isActive?: boolean;
  notes?: string;
};

export const BUDGET_SCENARIO_EFFECT_TYPES = ["cost", "revenue"] as const;
export type BudgetScenarioEffectType = (typeof BUDGET_SCENARIO_EFFECT_TYPES)[number];

export const BUDGET_SCENARIO_EFFECT_TYPE_LABELS: Record<BudgetScenarioEffectType, string> = {
  cost: "Koszty",
  revenue: "Przychody",
};

export function isBudgetScenarioEffectType(value: string): value is BudgetScenarioEffectType {
  return (BUDGET_SCENARIO_EFFECT_TYPES as readonly string[]).includes(value);
}

export type BudgetScenarioAction = {
  id: string;
  name: string;
  notes: string;
  effectType: BudgetScenarioEffectType;
  /** Dodatnia = wzrost, ujemna = spadek (np. zwolnienie pracownika = cost, wartość ujemna). */
  amount: number;
  cadence: BudgetCostCadence;
  intervalMonths: number | null;
  month: string | null;
  startMonth: string;
  endMonth: string | null;
  isEnabled: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetScenarioActionInput = {
  name: string;
  notes?: string;
  effectType: BudgetScenarioEffectType;
  amount: number;
  cadence: BudgetCostCadence;
  intervalMonths?: number | null;
  month?: string | null;
  startMonth?: string;
  endMonth?: string | null;
  isEnabled?: boolean;
};

export type BudgetForecastSettings = {
  openingBalance: number;
  openingBalanceAsOf: string; // "YYYY-MM-DD"
  variableCostPercent: number; // 0..1
  confidenceWeights: Record<BudgetConfidenceLevel, number>; // każda 0..1
  forecastHorizonMonths: number;
  updatedByName: string | null;
  updatedAt: string;
};

export const BUDGET_FORECAST_SETTINGS_ID = "budget_forecast_settings";

export function monthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date.slice(0, 10)}T00:00:00Z`) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export const DEFAULT_BUDGET_FORECAST_SETTINGS: BudgetForecastSettings = {
  openingBalance: 0,
  openingBalanceAsOf: currentMonthKey(),
  variableCostPercent: 0.45,
  confidenceWeights: { ok: 1, high: 0.7, medium: 0.4, low: 0.15, frozen: 0 },
  forecastHorizonMonths: 12,
  updatedByName: null,
  updatedAt: new Date(0).toISOString(),
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeBudgetForecastSettings(value: unknown): BudgetForecastSettings {
  const data = asObject(value);
  const weightsRaw = asObject(data.confidenceWeights);
  const defaults = DEFAULT_BUDGET_FORECAST_SETTINGS;

  const confidenceWeights = BUDGET_CONFIDENCE_LEVELS.reduce(
    (acc, level) => {
      const raw = asFiniteNumber(weightsRaw[level], defaults.confidenceWeights[level]);
      acc[level] = Math.min(1, Math.max(0, raw));
      return acc;
    },
    {} as Record<BudgetConfidenceLevel, number>,
  );

  return {
    openingBalance: asFiniteNumber(data.openingBalance, defaults.openingBalance),
    openingBalanceAsOf:
      typeof data.openingBalanceAsOf === "string" && data.openingBalanceAsOf
        ? data.openingBalanceAsOf
        : defaults.openingBalanceAsOf,
    variableCostPercent: Math.min(
      1,
      Math.max(0, asFiniteNumber(data.variableCostPercent, defaults.variableCostPercent)),
    ),
    confidenceWeights,
    forecastHorizonMonths: Math.max(
      1,
      Math.round(asFiniteNumber(data.forecastHorizonMonths, defaults.forecastHorizonMonths)),
    ),
    updatedByName: typeof data.updatedByName === "string" ? data.updatedByName : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : defaults.updatedAt,
  };
}

/** Dodaje `n` miesięcy do klucza miesiąca ("YYYY-MM-01"), zwraca też w tym formacie. */
export function addMonthsToKey(key: string, n: number): string {
  const [year, month] = key.split("-").map((part) => Number(part));
  const total = (year * 12 + (month - 1)) + n;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
}

/** Buduje rosnącą listę `count` kluczy miesięcy zaczynając od `startKey` (włącznie). */
export function buildMonthsWindow(startKey: string, count: number): string[] {
  const start = monthKey(startKey);
  return Array.from({ length: count }, (_, i) => addMonthsToKey(start, i));
}

export function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
}
