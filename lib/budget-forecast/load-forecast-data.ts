import { fetchActiveBudgetCostItems } from "@/lib/supabase/budget-cost-item-repository";
import { fetchBudgetForecastSettings } from "@/lib/supabase/budget-forecast-settings-repository";
import { fetchAllProjectRevenueForecastsWithProjectNames } from "@/lib/supabase/project-revenue-forecast-repository";
import { fetchAllBudgetScenarioActions } from "@/lib/supabase/budget-scenario-action-repository";
import { fetchCompanySettlementEntriesByKindInRange } from "@/lib/supabase/project-settlement-repository";
import {
  buildMonthsWindow,
  currentMonthKey,
  monthKey,
  type BudgetCostItem,
  type BudgetForecastSettings,
  type BudgetScenarioAction,
} from "@/lib/budget-forecast/types";
import type { MonthlyAmount, PipelineForecastAmount } from "@/lib/budget-forecast/engine";

export type BudgetForecastDataset = {
  settings: BudgetForecastSettings;
  costItems: BudgetCostItem[];
  scenarioActions: BudgetScenarioAction[];
  months: string[];
  currentMonth: string;
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

  const [costItems, scenarioActions, pipelineEntries, settlementEntries] = await Promise.all([
    fetchActiveBudgetCostItems(),
    fetchAllBudgetScenarioActions(),
    fetchAllProjectRevenueForecastsWithProjectNames(),
    fetchCompanySettlementEntriesByKindInRange(["schedule"], fromDate, toDate),
  ]);

  // To jest budżet/plan — pokazujemy cały harmonogram spłat niezależnie od tego, czy dana rata
  // została już realnie opłacona. Rozliczenie realne-vs-budżet to osobny widok po integracji
  // z iFirma/KSeF, więc kind='payment' celowo nie jest tu pobierane.
  const scheduledEntries: MonthlyAmount[] = [];
  for (const entry of settlementEntries) {
    if (!entry.entryDate) continue;
    scheduledEntries.push({ month: monthKey(entry.entryDate), amountGross: entry.amountGross });
  }

  const pipelineForecasts = pipelineEntries
    .filter((entry) => months.includes(monthKey(entry.expectedDate)))
    .map((entry) => ({
      month: entry.expectedDate,
      amountNet: entry.amountNet,
      confidence: entry.confidence,
      projectId: entry.projectId,
      projectName: entry.projectName,
    }));

  return {
    settings,
    costItems,
    scenarioActions,
    months,
    currentMonth,
    scheduledEntries,
    pipelineForecasts,
  };
}
