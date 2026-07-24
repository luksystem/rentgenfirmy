import {
  addMonthsToKey,
  compareMonthKeys,
  monthKey,
  type BudgetConfidenceLevel,
  type BudgetCostCadence,
  type BudgetCostItem,
  type BudgetScenarioAction,
} from "@/lib/budget-forecast/types";

export type MonthlyAmount = { month: string; amountGross: number };

export type PipelineForecastAmount = {
  month: string;
  amountGross: number;
  confidence: BudgetConfidenceLevel;
};

export type MonthlyForecastInputs = {
  /** Okno miesięcy rosnąco, np. 12 kluczy "YYYY-MM-01" od bieżącego miesiąca. */
  months: string[];
  currentMonth: string;
  openingBalance: number;
  /** Zagregowane rzeczywiste wpłaty (kind='payment') per miesiąc. */
  actualPayments: MonthlyAmount[];
  /** Zagregowany harmonogram spłat (kind='schedule') per miesiąc — traktowany jako pewny. */
  scheduledEntries: MonthlyAmount[];
  /** Pipeline przychodów powiązany z projektami, ważony suwakami pewności. */
  pipelineForecasts: PipelineForecastAmount[];
  confidenceWeights: Record<BudgetConfidenceLevel, number>;
  costItems: BudgetCostItem[];
  variableCostPercent: number;
  /** Przełączalne akcje "co jeśli" (zwolnienie, nowa umowa, redukcja kosztów...) — tylko włączone są uwzględniane. */
  scenarioActions: BudgetScenarioAction[];
};

export type MonthlyForecastRow = {
  month: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  actualRevenue: number;
  scheduledRevenue: number;
  pipelineRevenueRaw: number;
  pipelineRevenueWeighted: number;
  /** Suma włączonych akcji symulacyjnych po stronie przychodów tego miesiąca. */
  scenarioRevenueDelta: number;
  /** Suma włączonych akcji symulacyjnych po stronie kosztów tego miesiąca (może obniżać koszty). */
  scenarioCostDelta: number;
  totalRevenueForMonth: number;
  fixedCosts: number;
  variableCosts: number;
  /** Wynik miesiąca (nie narastająco) — odpowiednik "Stan miesiąca" z arkusza. */
  netResult: number;
  /** Saldo narastające — odpowiednik "Przewidywany progress" z arkusza. */
  cumulativeBalance: number;
};

type CadenceSchedule = {
  cadence: BudgetCostCadence;
  intervalMonths: number | null;
  month: string | null;
  startMonth: string;
  endMonth: string | null;
};

export function groupAmountByMonth(entries: MonthlyAmount[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    const key = monthKey(entry.month);
    result[key] = (result[key] ?? 0) + entry.amountGross;
  }
  return result;
}

export function resolveConfidenceWeight(
  confidence: BudgetConfidenceLevel,
  weights: Record<BudgetConfidenceLevel, number>,
): number {
  const weight = weights[confidence];
  return Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0;
}

function groupPipelineWeightedByMonth(
  entries: PipelineForecastAmount[],
  weights: Record<BudgetConfidenceLevel, number>,
): { raw: Record<string, number>; weighted: Record<string, number> } {
  const raw: Record<string, number> = {};
  const weighted: Record<string, number> = {};
  for (const entry of entries) {
    const key = monthKey(entry.month);
    raw[key] = (raw[key] ?? 0) + entry.amountGross;
    weighted[key] = (weighted[key] ?? 0) + entry.amountGross * resolveConfidenceWeight(entry.confidence, weights);
  }
  return { raw, weighted };
}

/** Rozwija dowolną pozycję z harmonogramem cykliczności (koszt stały lub akcja symulacyjna) na miesiące okna. */
export function expandAmountToMonths(
  schedule: CadenceSchedule,
  amount: number,
  months: string[],
): Record<string, number> {
  const result: Record<string, number> = {};

  if (schedule.cadence === "one_off") {
    if (schedule.month && months.includes(monthKey(schedule.month))) {
      result[monthKey(schedule.month)] = amount;
    }
    return result;
  }

  const start = monthKey(schedule.startMonth);
  const end = schedule.endMonth ? monthKey(schedule.endMonth) : null;

  if (schedule.cadence === "monthly") {
    for (const month of months) {
      if (compareMonthKeys(month, start) >= 0 && (!end || compareMonthKeys(month, end) <= 0)) {
        result[month] = amount;
      }
    }
    return result;
  }

  // every_n_months
  const interval = schedule.intervalMonths && schedule.intervalMonths > 0 ? schedule.intervalMonths : 1;
  let cursor = start;
  // Zabezpieczenie przed nieskończoną pętlą przy złych danych.
  for (let i = 0; i < 1000; i++) {
    if (end && compareMonthKeys(cursor, end) > 0) break;
    if (months.length > 0 && compareMonthKeys(cursor, months[months.length - 1]) > 0) break;
    if (months.includes(cursor)) {
      result[cursor] = amount;
    }
    cursor = addMonthsToKey(cursor, interval);
  }
  return result;
}

/** Czy dany miesiąc okna jest objęty pozycją kosztową, wg jej cadence. */
export function expandCostItemToMonths(item: BudgetCostItem, months: string[]): Record<string, number> {
  return expandAmountToMonths(item, item.amount, months);
}

export function aggregateCostItemsToMonths(items: BudgetCostItem[], months: string[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const month of months) {
    totals[month] = 0;
  }
  for (const item of items) {
    if (!item.isActive) continue;
    const perMonth = expandCostItemToMonths(item, months);
    for (const [month, amount] of Object.entries(perMonth)) {
      totals[month] = (totals[month] ?? 0) + amount;
    }
  }
  return totals;
}

/** Sumuje włączone akcje symulacyjne na miesiące, osobno dla kosztów i przychodów. */
export function aggregateScenarioActionsToMonths(
  actions: BudgetScenarioAction[],
  months: string[],
): { costDeltaByMonth: Record<string, number>; revenueDeltaByMonth: Record<string, number> } {
  const costDeltaByMonth: Record<string, number> = {};
  const revenueDeltaByMonth: Record<string, number> = {};
  for (const month of months) {
    costDeltaByMonth[month] = 0;
    revenueDeltaByMonth[month] = 0;
  }

  for (const action of actions) {
    if (!action.isEnabled) continue;
    const perMonth = expandAmountToMonths(action, action.amount, months);
    const target = action.effectType === "cost" ? costDeltaByMonth : revenueDeltaByMonth;
    for (const [month, amount] of Object.entries(perMonth)) {
      target[month] = (target[month] ?? 0) + amount;
    }
  }

  return { costDeltaByMonth, revenueDeltaByMonth };
}

export function buildMonthlyForecast(inputs: MonthlyForecastInputs): MonthlyForecastRow[] {
  const actualByMonth = groupAmountByMonth(inputs.actualPayments);
  const scheduledByMonth = groupAmountByMonth(inputs.scheduledEntries);
  const { raw: pipelineRawByMonth, weighted: pipelineWeightedByMonth } = groupPipelineWeightedByMonth(
    inputs.pipelineForecasts,
    inputs.confidenceWeights,
  );
  const fixedCostsByMonth = aggregateCostItemsToMonths(inputs.costItems, inputs.months);
  const { costDeltaByMonth, revenueDeltaByMonth } = aggregateScenarioActionsToMonths(
    inputs.scenarioActions,
    inputs.months,
  );

  let cumulativeBalance = inputs.openingBalance;
  const rows: MonthlyForecastRow[] = [];

  for (const month of inputs.months) {
    const isPast = compareMonthKeys(month, inputs.currentMonth) < 0;
    const isCurrent = compareMonthKeys(month, inputs.currentMonth) === 0;
    const isFuture = compareMonthKeys(month, inputs.currentMonth) > 0;

    const actualRevenue = actualByMonth[month] ?? 0;
    const scheduledRevenue = scheduledByMonth[month] ?? 0;
    const pipelineRevenueRaw = pipelineRawByMonth[month] ?? 0;
    const pipelineRevenueWeighted = pipelineWeightedByMonth[month] ?? 0;
    const scenarioRevenueDelta = revenueDeltaByMonth[month] ?? 0;
    const scenarioCostDelta = costDeltaByMonth[month] ?? 0;

    const baseRevenueForMonth = isPast
      ? actualRevenue
      : isCurrent
        ? actualRevenue + scheduledRevenue + pipelineRevenueWeighted
        : scheduledRevenue + pipelineRevenueWeighted;

    // Akcje symulacyjne po stronie przychodów wchodzą też do bazy liczącej koszt zmienny
    // (tak jak w arkuszu: "planowane działania zwiększające sprzedaż" liczą się do % kosztu).
    const totalRevenueForMonth = baseRevenueForMonth + scenarioRevenueDelta;

    const fixedCosts = (fixedCostsByMonth[month] ?? 0) + scenarioCostDelta;
    const variableCosts = inputs.variableCostPercent * totalRevenueForMonth;
    const netResult = totalRevenueForMonth - fixedCosts - variableCosts;

    cumulativeBalance += netResult;

    rows.push({
      month,
      isPast,
      isCurrent,
      isFuture,
      actualRevenue,
      scheduledRevenue,
      pipelineRevenueRaw,
      pipelineRevenueWeighted,
      scenarioRevenueDelta,
      scenarioCostDelta,
      totalRevenueForMonth,
      fixedCosts,
      variableCosts,
      netResult,
      cumulativeBalance,
    });
  }

  return rows;
}
