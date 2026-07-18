import {
  emptyBillingSettings,
  isContractQuotaUnit,
  normalizeAgreementVatRate,
  type ProjectBillingSettings,
  type ProjectBillingSettingsInput,
  type ProjectContractQuota,
  type ProjectContractQuotaInput,
  type ProjectHourlyReport,
  type ProjectHourlyReportInput,
} from "@/lib/settlements/types";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type SettingsRow = Database["public"]["Tables"]["project_billing_settings"]["Row"];
type QuotaRow = Database["public"]["Tables"]["project_contract_quotas"]["Row"];
type HourlyRow = Database["public"]["Tables"]["project_hourly_reports"]["Row"];

function num(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rowToBillingSettings(row: SettingsRow): ProjectBillingSettings {
  return {
    projectId: row.project_id,
    fixedPriceEnabled: Boolean(row.fixed_price_enabled),
    hourlyEnabled: Boolean(row.hourly_enabled),
    contractAmountNet: num(row.contract_amount_net),
    contractVatRate:
      row.contract_vat_rate != null ? normalizeAgreementVatRate(Number(row.contract_vat_rate)) : null,
    contractAmountGross: num(row.contract_amount_gross),
    hourlyRateNet: num(row.hourly_rate_net),
    currency: row.currency || "PLN",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToContractQuota(row: QuotaRow): ProjectContractQuota {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    quantity: Number(row.quantity) || 0,
    unit: isContractQuotaUnit(row.unit) ? row.unit : "other",
    position: row.position,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToHourlyReport(row: HourlyRow): ProjectHourlyReport {
  return {
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
  };
}

export async function fetchProjectBillingSettings(
  projectId: string,
): Promise<ProjectBillingSettings | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_billing_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data ? rowToBillingSettings(data as SettingsRow) : null;
}

export async function upsertProjectBillingSettings(
  projectId: string,
  input: ProjectBillingSettingsInput,
): Promise<ProjectBillingSettings> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const vatRate =
    input.contractAmountNet != null && Number.isFinite(input.contractAmountNet)
      ? normalizeAgreementVatRate(input.contractVatRate)
      : null;

  const { data, error } = await supabase
    .from("project_billing_settings")
    .upsert(
      {
        project_id: projectId,
        fixed_price_enabled: input.fixedPriceEnabled,
        hourly_enabled: input.hourlyEnabled,
        contract_amount_net: input.contractAmountNet ?? null,
        contract_vat_rate: vatRate,
        contract_amount_gross: input.contractAmountGross ?? null,
        hourly_rate_net: input.hourlyRateNet ?? null,
        currency: input.currency?.trim() || "PLN",
        notes: input.notes?.trim() ?? "",
        updated_at: now,
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToBillingSettings(data as SettingsRow);
}

export async function fetchProjectContractQuotas(projectId: string): Promise<ProjectContractQuota[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_contract_quotas")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToContractQuota(row as QuotaRow));
}

export async function createProjectContractQuota(
  projectId: string,
  input: ProjectContractQuotaInput,
): Promise<ProjectContractQuota> {
  const supabase = getSupabase();
  const { data: lastRow } = await supabase
    .from("project_contract_quotas")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = input.position ?? (((lastRow as { position?: number } | null)?.position ?? -1) + 1);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_contract_quotas")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      label: input.label.trim(),
      quantity: input.quantity,
      unit: input.unit,
      position,
      notes: input.notes?.trim() ?? "",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContractQuota(data as QuotaRow);
}

export async function updateProjectContractQuota(
  quotaId: string,
  input: ProjectContractQuotaInput,
): Promise<ProjectContractQuota> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_contract_quotas")
    .update({
      label: input.label.trim(),
      quantity: input.quantity,
      unit: input.unit,
      notes: input.notes?.trim() ?? "",
      ...(input.position != null ? { position: input.position } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", quotaId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContractQuota(data as QuotaRow);
}

export async function deleteProjectContractQuota(quotaId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_contract_quotas").delete().eq("id", quotaId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchProjectHourlyReports(projectId: string): Promise<ProjectHourlyReport[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_hourly_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToHourlyReport(row as HourlyRow));
}

export async function createProjectHourlyReport(
  projectId: string,
  input: ProjectHourlyReportInput,
  createdByName: string,
): Promise<ProjectHourlyReport> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_hourly_reports")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      work_date: input.workDate,
      hours: input.hours,
      role_label: input.roleLabel?.trim() ?? "",
      amount_net: input.amountNet ?? null,
      vat_rate: input.vatRate ?? null,
      amount_gross: input.amountGross ?? null,
      notes: input.notes?.trim() ?? "",
      created_by_name: createdByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToHourlyReport(data as HourlyRow);
}

export async function updateProjectHourlyReport(
  reportId: string,
  input: ProjectHourlyReportInput,
): Promise<ProjectHourlyReport> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_hourly_reports")
    .update({
      work_date: input.workDate,
      hours: input.hours,
      role_label: input.roleLabel?.trim() ?? "",
      amount_net: input.amountNet ?? null,
      vat_rate: input.vatRate ?? null,
      amount_gross: input.amountGross ?? null,
      notes: input.notes?.trim() ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToHourlyReport(data as HourlyRow);
}

export async function deleteProjectHourlyReport(reportId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_hourly_reports").delete().eq("id", reportId);
  if (error) {
    throw new Error(error.message);
  }
}

export { emptyBillingSettings };
