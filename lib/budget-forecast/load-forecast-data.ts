import { fetchActiveBudgetCostItems } from "@/lib/supabase/budget-cost-item-repository";
import { fetchBudgetForecastSettings } from "@/lib/supabase/budget-forecast-settings-repository";
import { fetchAllProjectRevenueForecastsWithProjectNames } from "@/lib/supabase/project-revenue-forecast-repository";
import { fetchCompanySettlementEntriesByKindInRange } from "@/lib/supabase/project-settlement-repository";
import {
  buildMonthsWindow,
  currentMonthKey,
  monthKey,
  type BudgetCostItem,
  type BudgetForecastSettings,
} from "@/lib/budget-forecast/types";
import type { MonthlyAmount, PipelineForecastAmount } from "@/lib/budget-forecast/engine";

export type BudgetForecastDataset = {
  settings: BudgetForecastSettings;
  costItems: BudgetCostItem[];
  months: string[];
  currentMonth: string;
  actualPayments: MonthlyAmount[];
  scheduledEntries: MonthlyAmount[];
  pipelineForecasts: Array<PipelineForecastAmount & { projectId: string; projectName: string }>;
};

export async function loadBudgetForecastDataset(horizonMonthsOverride?: number): Promise<BudgetForecastDataset> {
  const settings = await fetchBudgetForecastSettings();
  const currentMonth = currentMonthKey();
  const horizon = horizonMonthsOverride ?? settings.forecastHorizonMonths;
  const months = buildMonthsWindow(currentMonth, horizon);
  const fromDate = months[0];
  const toDate = months[months.length - 1];

  const [costItems, pipelineEntries, settlementEntries] = await Promise.all([
    fetchActiveBudgetCostItems(),
    fetchAllProjectRevenueForecastsWithProjectNames(),
    fetchCompanySettlementEntriesByKindInRange(["payment", "schedule"], fromDate, toDate),
  ]);

  const actualPayments: MonthlyAmount[] = [];
  const scheduledEntries: MonthlyAmount[] = [];
  for (const entry of settlementEntries) {
    if (!entry.entryDate) continue;
    const amount = { month: monthKey(entry.entryDate), amountGross: entry.amountGross };
    if (entry.kind === "payment") {
      actualPayments.push(amount);
    } else if (entry.kind === "schedule") {
      scheduledEntries.push(amount);
    }
  }

  const pipelineForecasts = pipelineEntries
    .filter((entry) => months.includes(monthKey(entry.expectedMonth)))
    .map((entry) => ({
      month: entry.expectedMonth,
      amountGross: entry.amountGross,
      confidence: entry.confidence,
      projectId: entry.projectId,
      projectName: entry.projectName,
    }));

  return {
    settings,
    costItems,
    months,
    currentMonth,
    actualPayments,
    scheduledEntries,
    pipelineForecasts,
  };
}
