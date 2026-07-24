import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { buildMonthlyForecast, type MonthlyForecastInputs } from "@/lib/budget-forecast/engine";
import {
  BUDGET_FORECAST_SETTINGS_ID,
  buildMonthsWindow,
  currentMonthKey,
  normalizeBudgetForecastSettings,
  type BudgetCostItem,
  type BudgetScenarioAction,
} from "@/lib/budget-forecast/types";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

type CostItemRow = {
  id: string;
  name: string;
  category: BudgetCostItem["category"];
  amount: number;
  cadence: BudgetCostItem["cadence"];
  interval_months: number | null;
  month: string | null;
  start_month: string;
  end_month: string | null;
  is_active: boolean;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapCostItem(row: CostItemRow): BudgetCostItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    cadence: row.cadence,
    intervalMonths: row.interval_months,
    month: row.month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    isActive: row.is_active,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ScenarioActionRow = {
  id: string;
  name: string;
  notes: string;
  effect_type: BudgetScenarioAction["effectType"];
  amount: number;
  cadence: BudgetScenarioAction["cadence"];
  interval_months: number | null;
  month: string | null;
  start_month: string;
  end_month: string | null;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapScenarioAction(row: ScenarioActionRow): BudgetScenarioAction {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    effectType: row.effect_type,
    amount: row.amount,
    cadence: row.cadence,
    intervalMonths: row.interval_months,
    month: row.month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    isEnabled: row.is_enabled,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Odpowiednik lib/budget-forecast/load-forecast-data.ts, ale po stronie serwera (klient
 * service-role) — loader z tamtego pliku używa klienckiego getSupabase() i nie nadaje się
 * do wywołania z API route. Sama matematyka prognozy (buildMonthlyForecast) jest współdzielona
 * bez duplikacji.
 */
async function loadForecastRowsServer(admin: AdminClient) {
  const { data: settingsRow } = await admin
    .from("app_settings")
    .select("data")
    .eq("id", BUDGET_FORECAST_SETTINGS_ID)
    .maybeSingle();
  const settings = normalizeBudgetForecastSettings(settingsRow?.data);

  const currentMonth = currentMonthKey();
  const months = buildMonthsWindow(currentMonth, settings.forecastHorizonMonths);
  const fromDate = months[0];
  const toDate = months[months.length - 1];

  const [costItemsRes, scenarioActionsRes, pipelineRes, settlementRes] = await Promise.all([
    admin.from("budget_cost_items").select("*").eq("is_active", true),
    admin.from("budget_scenario_actions").select("*").eq("is_enabled", true),
    admin.from("project_revenue_forecasts").select("expected_date, amount_net, confidence"),
    admin
      .from("project_settlement_entries")
      .select("kind, entry_date, amount_gross")
      .in("kind", ["payment", "schedule"])
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate),
  ]);
  if (costItemsRes.error) throw new Error(costItemsRes.error.message);
  if (scenarioActionsRes.error) throw new Error(scenarioActionsRes.error.message);
  if (pipelineRes.error) throw new Error(pipelineRes.error.message);
  if (settlementRes.error) throw new Error(settlementRes.error.message);

  const actualPayments: MonthlyForecastInputs["actualPayments"] = [];
  const scheduledEntries: MonthlyForecastInputs["scheduledEntries"] = [];
  for (const entry of (settlementRes.data ?? []) as Array<{
    kind: string;
    entry_date: string | null;
    amount_gross: number;
  }>) {
    if (!entry.entry_date) continue;
    const amount = { month: entry.entry_date, amountGross: entry.amount_gross };
    if (entry.kind === "payment") {
      actualPayments.push(amount);
    } else if (entry.kind === "schedule") {
      scheduledEntries.push(amount);
    }
  }

  const pipelineForecasts: MonthlyForecastInputs["pipelineForecasts"] = (
    (pipelineRes.data ?? []) as Array<{ expected_date: string; amount_net: number; confidence: string }>
  ).map((row) => ({
    month: row.expected_date,
    amountNet: row.amount_net,
    confidence: row.confidence as MonthlyForecastInputs["pipelineForecasts"][number]["confidence"],
  }));

  const inputs: MonthlyForecastInputs = {
    months,
    currentMonth,
    openingBalance: settings.openingBalance,
    actualPayments,
    scheduledEntries,
    pipelineForecasts,
    confidenceWeights: settings.confidenceWeights,
    costItems: ((costItemsRes.data ?? []) as CostItemRow[]).map(mapCostItem),
    variableCostPercent: settings.variableCostPercent,
    scenarioActions: ((scenarioActionsRes.data ?? []) as ScenarioActionRow[]).map(mapScenarioAction),
  };

  return buildMonthlyForecast(inputs);
}

async function sumEntriesGross(
  admin: AdminClient,
  kind: "sales_invoice" | "charge",
  dateColumn: "entry_date" | "due_date",
  fromIso: string,
  toIso: string,
) {
  const { data, error } = await admin
    .from("project_settlement_entries")
    .select("amount_gross")
    .eq("kind", kind)
    .gte(dateColumn, fromIso)
    .lte(dateColumn, toIso);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ amount_gross: number }>).reduce(
    (sum, row) => sum + row.amount_gross,
    0,
  );
}

/** Suma brutto przeterminowanych należności — bez odejmowania wpłat przypisanych do tego
 * samego projektu (pełne netowanie wymagałoby dopasowania payment↔charge per projekt, co
 * wykracza poza zakres jednego KPI dashboardu). Traktować jako górne oszacowanie. */
async function sumOverdueReceivables(admin: AdminClient, fromIso: string, toIso: string) {
  const { data, error } = await admin
    .from("project_settlement_entries")
    .select("amount_gross")
    .eq("kind", "charge")
    .lt("due_date", toISODate(new Date()))
    .gte("due_date", fromIso)
    .lte("due_date", toIso);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ amount_gross: number }>).reduce(
    (sum, row) => sum + row.amount_gross,
    0,
  );
}

async function countInvoicesToIssue(admin: AdminClient, fromIso: string, toIso: string) {
  const { data, error } = await admin
    .from("project_settlement_entries")
    .select("id, invoice_number")
    .eq("kind", "charge")
    .gte("due_date", fromIso)
    .lte("due_date", toIso);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ id: string; invoice_number: string }>).filter(
    (row) => !row.invoice_number,
  ).length;
}

export async function computeBudgetDomainReport(
  admin: AdminClient,
  asOf: Date,
  configByKey: Map<string, ReportKpiConfigRow>,
): Promise<DomainReport> {
  const kpis = [];

  const revenueConfig = configByKey.get("budget.revenue_mtd");
  if (revenueConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "month");
    const [value, previousValue] = await Promise.all([
      sumEntriesGross(admin, "sales_invoice", "entry_date", window.current.startDate, window.current.endDate),
      sumEntriesGross(admin, "sales_invoice", "entry_date", window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: revenueConfig,
        definition: KPI_DEFINITIONS["budget.revenue_mtd"],
      }),
    );
  }

  const receivablesConfig = configByKey.get("budget.receivables_overdue");
  if (receivablesConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "month");
    const [value, previousValue] = await Promise.all([
      sumOverdueReceivables(admin, window.current.startDate, window.current.endDate),
      sumOverdueReceivables(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: receivablesConfig,
        definition: KPI_DEFINITIONS["budget.receivables_overdue"],
      }),
    );
  }

  const invoicesConfig = configByKey.get("budget.invoices_to_issue");
  if (invoicesConfig?.enabled) {
    const window = resolveComparisonWindow(asOf, "week");
    const [value, previousValue] = await Promise.all([
      countInvoicesToIssue(admin, window.current.startDate, window.current.endDate),
      countInvoicesToIssue(admin, window.previous.startDate, window.previous.endDate),
    ]);
    kpis.push(
      computeKpiResult({
        value,
        previousValue,
        config: invoicesConfig,
        definition: KPI_DEFINITIONS["budget.invoices_to_issue"],
      }),
    );
  }

  const balance3mConfig = configByKey.get("budget.cashflow_balance_3m");
  const monthsToNegativeConfig = configByKey.get("budget.months_to_negative_balance");
  if (balance3mConfig?.enabled || monthsToNegativeConfig?.enabled) {
    const rows = await loadForecastRowsServer(admin);

    if (balance3mConfig?.enabled) {
      const row = rows[Math.min(3, rows.length - 1)];
      const value = row ? Math.round(row.cumulativeBalance) : 0;
      kpis.push(
        computeKpiResult({
          value,
          previousValue: null,
          config: balance3mConfig,
          definition: KPI_DEFINITIONS["budget.cashflow_balance_3m"],
        }),
      );
    }

    if (monthsToNegativeConfig?.enabled) {
      const negativeIndex = rows.findIndex((row) => row.cumulativeBalance < 0);
      const value = negativeIndex === -1 ? rows.length : negativeIndex;
      kpis.push(
        computeKpiResult({
          value,
          previousValue: null,
          config: monthsToNegativeConfig,
          definition: KPI_DEFINITIONS["budget.months_to_negative_balance"],
        }),
      );
    }
  }

  const quickWins: QuickWin[] = [];
  const monthsToNegativeKpi = kpis.find((kpi) => kpi.key === "budget.months_to_negative_balance");
  if (monthsToNegativeKpi && monthsToNegativeKpi.severity !== "good") {
    quickWins.push({
      id: "budget-cashflow-risk",
      severity: monthsToNegativeKpi.severity === "critical" ? "critical" : "warning",
      title: "Ryzyko płynności w prognozie",
      description:
        monthsToNegativeKpi.value === 0
          ? "Prognoza pokazuje ujemne saldo już w bieżącym miesiącu."
          : `Prognoza pokazuje ujemne saldo za ${monthsToNegativeKpi.value} mies.`,
      action: "Sprawdź moduł Prognoza finansowa — pipeline ofert, koszty stałe i akcje symulacyjne.",
    });
  }

  const receivablesKpi = kpis.find((kpi) => kpi.key === "budget.receivables_overdue");
  if (receivablesKpi && receivablesKpi.value > 0) {
    quickWins.push({
      id: "budget-receivables-overdue",
      severity: receivablesKpi.severity === "critical" ? "critical" : "warning",
      title: "Przeterminowane należności",
      description: `${receivablesKpi.displayValue} przeterminowanych należności w tym miesiącu.`,
      action: "Sprawdź rozliczenia projektów i wyślij przypomnienia o płatności.",
    });
  }

  return {
    domain: "budget",
    label: "Budżet firmy",
    kpis,
    severity: computeTileSeverity(kpis),
    trend: computeTileTrend(kpis),
    quickWins,
    detailRows: [],
  };
}
