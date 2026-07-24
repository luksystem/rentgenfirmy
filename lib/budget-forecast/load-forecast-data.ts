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

  const [costItems, scenarioActions, pipelineEntries, settlementEntries] = await Promise.all([
    fetchActiveBudgetCostItems(),
    fetchAllBudgetScenarioActions(),
    fetchAllProjectRevenueForecastsWithProjectNames(),
    fetchCompanySettlementEntriesByKindInRange(["payment", "schedule"], fromDate, toDate),
  ]);

  // Gdy rata harmonogramu zostaje opłacona, aplikacja dopisuje osobny wiersz kind='payment'
  // (source_id wskazujący na wiersz 'schedule'), ale NIE usuwa/nie oznacza oryginalnego wiersza
  // harmonogramu. Bez tego wykluczenia opłacona rata liczyłaby się podwójnie: raz jako realna
  // wpłata, raz jako wciąż "spodziewana" z harmonogramu.
  const paidScheduleIds = new Set(
    settlementEntries
      .filter((entry) => entry.kind === "payment" && entry.sourceId)
      .map((entry) => entry.sourceId as string),
  );

  const actualPayments: MonthlyAmount[] = [];
  const scheduledEntries: MonthlyAmount[] = [];
  for (const entry of settlementEntries) {
    if (!entry.entryDate) continue;
    const amount = { month: monthKey(entry.entryDate), amountGross: entry.amountGross };
    if (entry.kind === "payment") {
      actualPayments.push(amount);
    } else if (entry.kind === "schedule" && !paidScheduleIds.has(entry.id)) {
      scheduledEntries.push(amount);
    }
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
    actualPayments,
    scheduledEntries,
    pipelineForecasts,
  };
}
