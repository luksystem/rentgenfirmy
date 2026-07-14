import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchCompanyProfileServer } from "@/lib/supabase/company-profile-server";
import { fetchServiceSettings } from "@/lib/supabase/service-repository";
import type {
  VizTravelCalcInput,
  VizTravelCalcResult,
  VizTravelCalcSnapshot,
} from "@/lib/viz/contract-types";
import { calculateVizTravelCost } from "@/lib/viz/travel-cost";
import { resolveOneWayDistanceKm } from "@/lib/service/travel-context";
import { listVizDashboardProjects } from "@/lib/supabase/viz-server";

type SnapshotRow = {
  id: string;
  dashboard_id: string;
  project_id: string;
  label: string | null;
  company_address: string;
  client_address: string;
  one_way_km: number;
  trip_count: number;
  zone: number;
  car_km_cost: number;
  car_hours_cost: number;
  total_travel_cost: number;
  rates_json: unknown;
  zone_settings_json: unknown;
  input_json: unknown;
  created_by_user_id: string | null;
  created_by_name: string;
  created_at: string;
};

function rowToSnapshot(row: SnapshotRow, projectLabel: string): VizTravelCalcSnapshot {
  const settings = {
    rates:
      row.rates_json && typeof row.rates_json === "object" && !Array.isArray(row.rates_json)
        ? (row.rates_json as VizTravelCalcResult["rates"])
        : undefined,
    zoneSettings:
      row.zone_settings_json &&
      typeof row.zone_settings_json === "object" &&
      !Array.isArray(row.zone_settings_json)
        ? (row.zone_settings_json as VizTravelCalcResult["zoneSettings"])
        : undefined,
  };

  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    projectId: row.project_id,
    projectLabel,
    label: row.label,
    companyAddress: row.company_address,
    clientAddress: row.client_address,
    oneWayKm: Number(row.one_way_km),
    tripCount: row.trip_count,
    zone: row.zone as VizTravelCalcResult["zone"],
    suggestedCarHoursPerTrip: 0,
    carKmCost: Number(row.car_km_cost),
    carHoursCost: Number(row.car_hours_cost),
    totalTravelCost: Number(row.total_travel_cost),
    rates: settings.rates ?? ({} as VizTravelCalcResult["rates"]),
    zoneSettings: settings.zoneSettings ?? ({} as VizTravelCalcResult["zoneSettings"]),
    geocodeNote: null,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

export async function calculateDashboardTravelCost(
  dashboardId: string,
  input: VizTravelCalcInput,
): Promise<VizTravelCalcResult> {
  const projects = await listVizDashboardProjects(dashboardId);
  const project = projects.find((item) => item.projectId === input.projectId);
  if (!project) {
    throw new Error("Sklep nie jest przypisany do tego dashboardu.");
  }

  const [companyProfile, serviceSettings] = await Promise.all([
    fetchCompanyProfileServer(),
    fetchServiceSettings(),
  ]);

  const clientLocation = project.clientAddress ?? "";
  const distance = await resolveOneWayDistanceKm({
    companyAddress: companyProfile.address,
    client: null,
    clientLocationFallback: clientLocation,
  });

  const oneWayKm = distance.oneWayDistanceKm ?? 0;
  const tripCount = Math.max(1, input.tripCount ?? 1);
  const cost = calculateVizTravelCost({
    kilometersOneWay: oneWayKm,
    tripCount,
    carHours: input.carHours ?? 0,
    rates: serviceSettings.rates,
    zoneSettings: serviceSettings.zoneSettings,
  });

  return {
    projectId: project.projectId,
    projectLabel: project.displayName ?? project.projectName ?? project.projectId,
    companyAddress: companyProfile.address || "—",
    clientAddress: distance.clientAddress || clientLocation || "—",
    oneWayKm,
    tripCount,
    zone: cost.zone,
    suggestedCarHoursPerTrip: cost.suggestedCarHoursPerTrip,
    carKmCost: cost.carKmCost,
    carHoursCost: cost.carHoursCost,
    totalTravelCost: cost.totalTravelCost,
    rates: serviceSettings.rates,
    zoneSettings: serviceSettings.zoneSettings,
    geocodeNote: distance.geocodeNote,
  };
}

export async function listVizTravelCalcSnapshots(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const projects = await listVizDashboardProjects(dashboardId);
  const labelByProjectId = new Map(
    projects.map((project) => [
      project.projectId,
      project.displayName ?? project.projectName ?? project.projectId,
    ]),
  );

  const { data, error } = await supabase
    .from("viz_travel_calc_snapshots")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    rowToSnapshot(row as SnapshotRow, labelByProjectId.get(row.project_id as string) ?? ""),
  );
}

export async function saveVizTravelCalcSnapshot(
  dashboardId: string,
  result: VizTravelCalcResult,
  actor: { userId: string | null; userName: string },
  label?: string | null,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_travel_calc_snapshots")
    .insert({
      dashboard_id: dashboardId,
      project_id: result.projectId,
      label: label?.trim() || null,
      company_address: result.companyAddress,
      client_address: result.clientAddress,
      one_way_km: result.oneWayKm,
      trip_count: result.tripCount,
      zone: result.zone,
      car_km_cost: result.carKmCost,
      car_hours_cost: result.carHoursCost,
      total_travel_cost: result.totalTravelCost,
      rates_json: result.rates,
      zone_settings_json: result.zoneSettings,
      input_json: {
        tripCount: result.tripCount,
        geocodeNote: result.geocodeNote,
      },
      created_by_user_id: actor.userId,
      created_by_name: actor.userName,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToSnapshot(data as SnapshotRow, result.projectLabel);
}

export async function deleteVizTravelCalcSnapshot(snapshotId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_travel_calc_snapshots").delete().eq("id", snapshotId);
  if (error) {
    throw new Error(error.message);
  }
}
