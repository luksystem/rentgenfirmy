import {
  addMonthsToKey,
  compareMonthKeys,
  monthKey,
  type BudgetConfidenceLevel,
  type BudgetCostItem,
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
  totalRevenueForMonth: number;
  fixedCosts: number;
  variableCosts: number;
  netResult: number;
  cumulativeBalance: number;
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

/** Czy dany miesiąc okna jest objęty pozycją kosztową, wg jej cadence. */
export function expandCostItemToMonths(item: BudgetCostItem, months: string[]): Record<string, number> {
  const result: Record<string, number> = {};

  if (item.cadence === "one_off") {
    if (item.month && months.includes(monthKey(item.month))) {
      result[monthKey(item.month)] = item.amount;
    }
    return result;
  }

  const start = monthKey(item.startMonth);
  const end = item.endMonth ? monthKey(item.endMonth) : null;

  if (item.cadence === "monthly") {
    for (const month of months) {
      if (compareMonthKeys(month, start) >= 0 && (!end || compareMonthKeys(month, end) <= 0)) {
        result[month] = item.amount;
      }
    }
    return result;
  }

  // every_n_months
  const interval = item.intervalMonths && item.intervalMonths > 0 ? item.intervalMonths : 1;
  let cursor = start;
  // Zabezpieczenie przed nieskończoną pętlą przy złych danych.
  for (let i = 0; i < 1000; i++) {
    if (end && compareMonthKeys(cursor, end) > 0) break;
    if (months.length > 0 && compareMonthKeys(cursor, months[months.length - 1]) > 0) break;
    if (months.includes(cursor)) {
      result[cursor] = item.amount;
    }
    cursor = addMonthsToKey(cursor, interval);
  }
  return result;
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

export function buildMonthlyForecast(inputs: MonthlyForecastInputs): MonthlyForecastRow[] {
  const actualByMonth = groupAmountByMonth(inputs.actualPayments);
  const scheduledByMonth = groupAmountByMonth(inputs.scheduledEntries);
  const { raw: pipelineRawByMonth, weighted: pipelineWeightedByMonth } = groupPipelineWeightedByMonth(
    inputs.pipelineForecasts,
    inputs.confidenceWeights,
  );
  const fixedCostsByMonth = aggregateCostItemsToMonths(inputs.costItems, inputs.months);

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

    const totalRevenueForMonth = isPast
      ? actualRevenue
      : isCurrent
        ? actualRevenue + scheduledRevenue + pipelineRevenueWeighted
        : scheduledRevenue + pipelineRevenueWeighted;

    const fixedCosts = fixedCostsByMonth[month] ?? 0;
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
      totalRevenueForMonth,
      fixedCosts,
      variableCosts,
      netResult,
      cumulativeBalance,
    });
  }

  return rows;
}
