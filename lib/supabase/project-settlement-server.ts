import {
  emptyBillingSettings,
  isContractQuotaUnit,
  isSettlementKind,
  isSettlementSource,
  normalizeAgreementVatRate,
  type ProjectBillingSettings,
  type ProjectContractQuota,
  type ProjectHourlyReport,
  type ProjectSettlementEntry,
  type ProjectSettlementsBundle,
} from "@/lib/settlements/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildProjectHourBudget,
} from "@/lib/time-tracking/project-hour-budget";

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("does not exist") || lower.includes("could not find the table");
}

export async function settlementTablesExist(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_settlement_entries").select("id").limit(1);
  if (!error) {
    return true;
  }
  return !isMissingTableError(error.message);
}

export async function fetchProjectSettlementsBundleServer(
  projectId: string,
): Promise<ProjectSettlementsBundle> {
  const supabase = getSupabaseAdmin();

  const [settingsRes, quotasRes, hoursRes, entriesRes] = await Promise.all([
    supabase.from("project_billing_settings").select("*").eq("project_id", projectId).maybeSingle(),
    supabase
      .from("project_contract_quotas")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("project_hourly_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("work_date", { ascending: false }),
    supabase
      .from("project_settlement_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("entry_date", { ascending: false, nullsFirst: false }),
  ]);

  for (const result of [settingsRes, quotasRes, hoursRes, entriesRes]) {
    if (result.error && isMissingTableError(result.error.message)) {
      return {
        settings: emptyBillingSettings(projectId),
        quotas: [],
        hourlyReports: [],
        entries: [],
        hourBudget: null,
      };
    }
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const settingsRow = settingsRes.data as {
    project_id: string;
    fixed_price_enabled: boolean;
    hourly_enabled: boolean;
    contract_amount_net: number | string | null;
    contract_vat_rate: number | string | null;
    contract_amount_gross: number | string | null;
    currency: string;
    notes: string;
    created_at: string;
    updated_at: string;
  } | null;

  const settings: ProjectBillingSettings = settingsRow
    ? {
        projectId: settingsRow.project_id,
        fixedPriceEnabled: Boolean(settingsRow.fixed_price_enabled),
        hourlyEnabled: Boolean(settingsRow.hourly_enabled),
        contractAmountNet: num(settingsRow.contract_amount_net),
        contractVatRate:
          settingsRow.contract_vat_rate != null
            ? normalizeAgreementVatRate(Number(settingsRow.contract_vat_rate))
            : null,
        contractAmountGross: num(settingsRow.contract_amount_gross),
        hourlyRateNet: num(
          (settingsRow as { hourly_rate_net?: number | string | null }).hourly_rate_net,
        ),
        currency: settingsRow.currency || "PLN",
        notes: settingsRow.notes ?? "",
        createdAt: settingsRow.created_at,
        updatedAt: settingsRow.updated_at,
      }
    : emptyBillingSettings(projectId);

  const quotas: ProjectContractQuota[] = ((quotasRes.data ?? []) as Array<{
    id: string;
    project_id: string;
    label: string;
    quantity: number | string;
    unit: string;
    position: number;
    notes: string;
    time_category_id?: string | null;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    quantity: Number(row.quantity) || 0,
    unit: isContractQuotaUnit(row.unit) ? row.unit : "other",
    position: row.position,
    notes: row.notes ?? "",
    timeCategoryId: row.time_category_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const hourlyReports: ProjectHourlyReport[] = ((hoursRes.data ?? []) as Array<{
    id: string;
    project_id: string;
    work_date: string;
    hours: number | string;
    role_label: string;
    amount_net: number | string | null;
    vat_rate: number | string | null;
    amount_gross: number | string | null;
    notes: string;
    created_by_name: string;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workDate: row.work_date,
    hours: Number(row.hours) || 0,
    roleLabel: row.role_label ?? "",
    amountNet: num(row.amount_net),
    vatRate: num(row.vat_rate),
    amountGross: num(row.amount_gross),
    notes: row.notes ?? "",
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const entries: ProjectSettlementEntry[] = ((entriesRes.data ?? []) as Array<{
    id: string;
    project_id: string;
    kind: string;
    source: string;
    source_id: string | null;
    process_stage_id?: string | null;
    title: string;
    amount_net: number | string;
    vat_rate: number | string;
    amount_gross: number | string;
    currency: string;
    entry_date: string | null;
    due_date: string | null;
    invoice_number: string;
    external_ref: string;
    notes: string;
    is_auto: boolean;
    created_by_name: string;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    kind: isSettlementKind(row.kind) ? row.kind : "charge",
    source: isSettlementSource(row.source) ? row.source : "manual",
    sourceId: row.source_id,
    processStageId: row.process_stage_id ?? null,
    title: row.title,
    amountNet: Number(row.amount_net) || 0,
    vatRate: Number(row.vat_rate) || 0,
    amountGross: Number(row.amount_gross) || 0,
    currency: row.currency || "PLN",
    entryDate: row.entry_date,
    dueDate: row.due_date,
    invoiceNumber: row.invoice_number ?? "",
    externalRef: row.external_ref ?? "",
    notes: row.notes ?? "",
    isAuto: Boolean(row.is_auto),
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  let hourBudget = null;
  if (settings.hourlyEnabled) {
    const { data: timeRows, error: timeError } = await supabase
      .from("time_entries")
      .select("duration_minutes, status, category_id")
      .eq("project_id", projectId);
    if (timeError && !isMissingTableError(timeError.message)) {
      throw new Error(timeError.message);
    }

    const categoryIds = [
      ...new Set(
        [
          ...quotas.map((quota) => quota.timeCategoryId).filter(Boolean),
          ...(timeRows ?? []).map(
            (row) => (row as { category_id?: string | null }).category_id,
          ),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const categoryNames: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: categoryRows } = await supabase
        .from("time_categories")
        .select("id, name")
        .in("id", categoryIds);
      for (const row of categoryRows ?? []) {
        categoryNames[(row as { id: string }).id] = String((row as { name: string }).name ?? "");
      }
    }

    const budgetEntries = (timeRows ?? []).map((row) => ({
      durationMinutes: Number((row as { duration_minutes?: number }).duration_minutes) || 0,
      status: String((row as { status?: string }).status ?? ""),
      categoryId: (row as { category_id?: string | null }).category_id ?? null,
    }));
    hourBudget = buildProjectHourBudget(quotas, budgetEntries, {
      allowUsageOnly: true,
      categoryNames,
    });
  }

  return { settings, quotas, hourlyReports, entries, hourBudget };
}
