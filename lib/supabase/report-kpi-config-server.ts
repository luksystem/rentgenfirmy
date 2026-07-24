import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ComparisonPeriodKind,
  KpiDomain,
  ReportKpiConfigRow,
} from "@/lib/report-kpi/types";

type AdminClient = SupabaseClient;

type ConfigRowFromDb = {
  kpi_key: string;
  domain: string;
  label: string;
  enabled: boolean;
  warning_threshold: number | null;
  critical_threshold: number | null;
  comparison_period: string;
  sort_order: number;
};

function mapConfigRow(row: ConfigRowFromDb): ReportKpiConfigRow {
  return {
    kpiKey: row.kpi_key,
    domain: row.domain as KpiDomain,
    label: row.label,
    enabled: row.enabled,
    warningThreshold: row.warning_threshold,
    criticalThreshold: row.critical_threshold,
    comparisonPeriod: row.comparison_period as ComparisonPeriodKind,
    sortOrder: row.sort_order,
  };
}

export async function fetchReportKpiConfigServer(admin: AdminClient): Promise<ReportKpiConfigRow[]> {
  const { data, error } = await admin
    .from("report_kpi_config")
    .select("*")
    .order("domain")
    .order("sort_order");
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapConfigRow(row as ConfigRowFromDb));
}

export async function fetchReportKpiConfigMapServer(
  admin: AdminClient,
): Promise<Map<string, ReportKpiConfigRow>> {
  const rows = await fetchReportKpiConfigServer(admin);
  return new Map(rows.map((row) => [row.kpiKey, row]));
}

export type ReportKpiConfigUpdateInput = {
  enabled?: boolean;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  comparisonPeriod?: ComparisonPeriodKind;
  sortOrder?: number;
};

export async function updateReportKpiConfigServer(
  admin: AdminClient,
  kpiKey: string,
  patch: ReportKpiConfigUpdateInput,
): Promise<ReportKpiConfigRow> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.warningThreshold !== undefined) update.warning_threshold = patch.warningThreshold;
  if (patch.criticalThreshold !== undefined) update.critical_threshold = patch.criticalThreshold;
  if (patch.comparisonPeriod !== undefined) update.comparison_period = patch.comparisonPeriod;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const { data, error } = await admin
    .from("report_kpi_config")
    .update(update)
    .eq("kpi_key", kpiKey)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }

  return mapConfigRow(data as ConfigRowFromDb);
}
