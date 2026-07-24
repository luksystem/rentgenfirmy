import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/utils";
import { computeKpiResult, resolveComparisonWindow } from "@/lib/report-kpi/kpi-engine";
import { computeTileSeverity, computeTileTrend } from "@/lib/report-kpi/tile-rollup";
import { KPI_DEFINITIONS, type DomainReport, type ReportKpiConfigRow } from "@/lib/report-kpi/types";
import type { QuickWin } from "@/lib/types";

type AdminClient = SupabaseClient;

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

  const quickWins: QuickWin[] = [];
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
