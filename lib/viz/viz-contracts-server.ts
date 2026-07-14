import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import type { KilometerZoneSettings, ServiceRates } from "@/lib/service/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  VizDashboardHoursSummary,
  VizProjectHoursSummary,
  VizServiceContract,
  VizServiceContractInput,
  VizServiceContractRateVersion,
  VizServiceContractRateVersionInput,
} from "@/lib/viz/contract-types";
import type { VizServiceContractStatus } from "@/lib/viz/types";
import { listVizDashboardProjects } from "@/lib/supabase/viz-server";

type ContractRow = {
  id: string;
  dashboard_id: string;
  name: string;
  contract_type: string;
  monthly_hours_budget: number | null;
  sla_response_hours: number | null;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RateVersionRow = {
  id: string;
  contract_id: string;
  version_label: string;
  valid_from: string;
  valid_until: string | null;
  rates_json: unknown;
  zone_settings_json: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectTermRow = {
  id: string;
  contract_id: string;
  project_id: string;
  monthly_hours_override: number | null;
  contract_status_override: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function parseRates(value: unknown): ServiceRates {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SERVICE_SETTINGS.rates;
  }
  const raw = value as Record<string, unknown>;
  const defaults = DEFAULT_SERVICE_SETTINGS.rates;
  return {
    supervisionHourly:
      typeof raw.supervisionHourly === "number" ? raw.supervisionHourly : defaults.supervisionHourly,
    installerHourly:
      typeof raw.installerHourly === "number" ? raw.installerHourly : defaults.installerHourly,
    helperHourly: typeof raw.helperHourly === "number" ? raw.helperHourly : defaults.helperHourly,
    programmerHourly:
      typeof raw.programmerHourly === "number" ? raw.programmerHourly : defaults.programmerHourly,
    carPerKm: typeof raw.carPerKm === "number" ? raw.carPerKm : defaults.carPerKm,
    carHourly: typeof raw.carHourly === "number" ? raw.carHourly : defaults.carHourly,
    accommodationCost:
      typeof raw.accommodationCost === "number" ? raw.accommodationCost : defaults.accommodationCost,
  };
}

function parseZoneSettings(value: unknown): KilometerZoneSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SERVICE_SETTINGS.zoneSettings;
  }
  const raw = value as Record<string, unknown>;
  const defaults = DEFAULT_SERVICE_SETTINGS.zoneSettings;
  return {
    zone1ThresholdKm:
      typeof raw.zone1ThresholdKm === "number" ? raw.zone1ThresholdKm : defaults.zone1ThresholdKm,
    zone2ThresholdKm:
      typeof raw.zone2ThresholdKm === "number" ? raw.zone2ThresholdKm : defaults.zone2ThresholdKm,
    zone3ThresholdKm:
      typeof raw.zone3ThresholdKm === "number" ? raw.zone3ThresholdKm : defaults.zone3ThresholdKm,
  };
}

function rowToRateVersion(row: RateVersionRow): VizServiceContractRateVersion {
  return {
    id: row.id,
    contractId: row.contract_id,
    versionLabel: row.version_label,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    rates: parseRates(row.rates_json),
    zoneSettings: parseZoneSettings(row.zone_settings_json),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToContract(
  row: ContractRow,
  rateVersions: VizServiceContractRateVersion[],
  projectTerms: ProjectTermRow[],
): VizServiceContract {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    name: row.name,
    contractType: row.contract_type as VizServiceContractStatus,
    monthlyHoursBudget: row.monthly_hours_budget != null ? Number(row.monthly_hours_budget) : null,
    slaResponseHours: row.sla_response_hours,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    notes: row.notes,
    isActive: row.is_active,
    rateVersions,
    projectTerms: projectTerms.map((term) => ({
      id: term.id,
      contractId: term.contract_id,
      projectId: term.project_id,
      monthlyHoursOverride:
        term.monthly_hours_override != null ? Number(term.monthly_hours_override) : null,
      contractStatusOverride: term.contract_status_override as VizServiceContractStatus | null,
      notes: term.notes,
      createdAt: term.created_at,
      updatedAt: term.updated_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVizServiceContracts(dashboardId: string): Promise<VizServiceContract[]> {
  const supabase = getSupabaseAdmin();
  const { data: contracts, error } = await supabase
    .from("viz_service_contracts")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("is_active", { ascending: false })
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (contracts ?? []) as ContractRow[];
  if (!rows.length) {
    return [];
  }

  const contractIds = rows.map((row) => row.id);
  const [{ data: rateVersions }, { data: projectTerms }] = await Promise.all([
    supabase
      .from("viz_service_contract_rate_versions")
      .select("*")
      .in("contract_id", contractIds)
      .order("valid_from", { ascending: false }),
    supabase.from("viz_service_contract_project_terms").select("*").in("contract_id", contractIds),
  ]);

  const ratesByContract = new Map<string, VizServiceContractRateVersion[]>();
  for (const row of (rateVersions ?? []) as RateVersionRow[]) {
    const list = ratesByContract.get(row.contract_id) ?? [];
    list.push(rowToRateVersion(row));
    ratesByContract.set(row.contract_id, list);
  }

  const termsByContract = new Map<string, ProjectTermRow[]>();
  for (const row of (projectTerms ?? []) as ProjectTermRow[]) {
    const list = termsByContract.get(row.contract_id) ?? [];
    list.push(row);
    termsByContract.set(row.contract_id, list);
  }

  return rows.map((row) =>
    rowToContract(row, ratesByContract.get(row.id) ?? [], termsByContract.get(row.id) ?? []),
  );
}

export async function createVizServiceContract(dashboardId: string, input: VizServiceContractInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_service_contracts")
    .insert({
      dashboard_id: dashboardId,
      name: input.name.trim(),
      contract_type: input.contractType ?? "mixed",
      monthly_hours_budget: input.monthlyHoursBudget ?? null,
      sla_response_hours: input.slaResponseHours ?? null,
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      notes: input.notes?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContract(data as ContractRow, [], []);
}

export async function createVizServiceContractRateVersion(input: VizServiceContractRateVersionInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_service_contract_rate_versions")
    .insert({
      contract_id: input.contractId,
      version_label: input.versionLabel.trim(),
      valid_from: input.validFrom,
      valid_until: input.validUntil ?? null,
      rates_json: input.rates,
      zone_settings_json: input.zoneSettings,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToRateVersion(data as RateVersionRow);
}

export async function deleteVizServiceContract(contractId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_service_contracts").delete().eq("id", contractId);
  if (error) {
    throw new Error(error.message);
  }
}

function monthBounds(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
  return { periodStart: toIsoDate(start), periodEnd: toIsoDate(end) };
}

export async function summarizeDashboardBillableHours(
  dashboardId: string,
  reference = new Date(),
): Promise<VizDashboardHoursSummary> {
  const projects = await listVizDashboardProjects(dashboardId);
  const projectIds = projects.map((project) => project.projectId);
  const { periodStart, periodEnd } = monthBounds(reference);

  if (!projectIds.length) {
    return { periodStart, periodEnd, totalHours: 0, billableHours: 0, projects: [] };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("time_entries")
    .select("project_id, duration_minutes, billable")
    .in("project_id", projectIds)
    .gte("date", periodStart)
    .lte("date", periodEnd);

  if (error) {
    throw new Error(error.message);
  }

  type TimeEntryHoursRow = {
    project_id: string;
    duration_minutes: number;
    billable: boolean;
  };

  const rows = (data ?? []) as TimeEntryHoursRow[];

  const labelByProjectId = new Map(
    projects.map((project) => [
      project.projectId,
      project.displayName ?? project.projectName ?? project.projectId,
    ]),
  );

  const byProject = new Map<string, VizProjectHoursSummary>();
  for (const projectId of projectIds) {
    byProject.set(projectId, {
      projectId,
      projectLabel: labelByProjectId.get(projectId) ?? projectId,
      totalMinutes: 0,
      billableMinutes: 0,
      totalHours: 0,
      billableHours: 0,
    });
  }

  for (const row of rows) {
    const projectId = row.project_id;
    const summary = byProject.get(projectId);
    if (!summary) {
      continue;
    }
    const minutes = Number(row.duration_minutes ?? 0);
    summary.totalMinutes += minutes;
    if (row.billable) {
      summary.billableMinutes += minutes;
    }
  }

  const projectSummaries = [...byProject.values()].map((summary) => ({
    ...summary,
    totalHours: Math.round((summary.totalMinutes / 60) * 10) / 10,
    billableHours: Math.round((summary.billableMinutes / 60) * 10) / 10,
  }));

  const totalMinutes = projectSummaries.reduce((sum, item) => sum + item.totalMinutes, 0);
  const billableMinutes = projectSummaries.reduce((sum, item) => sum + item.billableMinutes, 0);

  return {
    periodStart,
    periodEnd,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    billableHours: Math.round((billableMinutes / 60) * 10) / 10,
    projects: projectSummaries.sort((a, b) => b.billableHours - a.billableHours),
  };
}
