import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizDashboardChartRow } from "@/lib/supabase/database.types";
import type {
  VizChartConfig,
  VizChartType,
  VizDashboardChart,
  VizDashboardChartInput,
  VizHistoryPoint,
} from "@/lib/viz/chart-types";
import { listVizDashboardProjects, listVizVariableMappings } from "@/lib/supabase/viz-server";

type ChartRow = {
  id: string;
  dashboard_id: string;
  name: string;
  description: string | null;
  chart_type: string;
  config_json: unknown;
  sort_order: number;
  is_widget: boolean;
  created_at: string;
  updated_at: string;
};

function parseChartConfig(value: unknown): VizChartConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      mode: "single",
      roleCode: "store_temperature",
      projectIds: [],
      periodHours: 24,
    };
  }
  const raw = value as Record<string, unknown>;
  return {
    mode: raw.mode === "compare" ? "compare" : "single",
    roleCode: typeof raw.roleCode === "string" ? raw.roleCode : "store_temperature",
    projectIds: Array.isArray(raw.projectIds)
      ? raw.projectIds.filter((id): id is string => typeof id === "string")
      : [],
    periodHours: typeof raw.periodHours === "number" ? raw.periodHours : 24,
    showLegend: raw.showLegend !== false,
    showTooltip: raw.showTooltip !== false,
    yAxisMin: typeof raw.yAxisMin === "number" ? raw.yAxisMin : null,
    yAxisMax: typeof raw.yAxisMax === "number" ? raw.yAxisMax : null,
    unit: typeof raw.unit === "string" ? raw.unit : null,
    seriesColors:
      raw.seriesColors && typeof raw.seriesColors === "object" && !Array.isArray(raw.seriesColors)
        ? (raw.seriesColors as Record<string, string>)
        : undefined,
  };
}

function rowToChart(row: ChartRow): VizDashboardChart {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    name: row.name,
    description: row.description,
    chartType: row.chart_type as VizChartType,
    config: parseChartConfig(row.config_json),
    sortOrder: row.sort_order,
    isWidget: row.is_widget,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listVizDashboardCharts(dashboardId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_charts")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("sort_order")
    .order("name");

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToChart(row as ChartRow));
}

export async function createVizDashboardChart(dashboardId: string, input: VizDashboardChartInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("viz_dashboard_charts")
    .insert({
      dashboard_id: dashboardId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      chart_type: input.chartType ?? "line",
      config_json: input.config,
      sort_order: input.sortOrder ?? 0,
      is_widget: input.isWidget ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChart(data as ChartRow);
}

export async function updateVizDashboardChart(chartId: string, input: Partial<VizDashboardChartInput>) {
  const supabase = getSupabaseAdmin();
  const payload: Partial<VizDashboardChartRow> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.chartType !== undefined) payload.chart_type = input.chartType;
  if (input.config !== undefined) payload.config_json = input.config;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.isWidget !== undefined) payload.is_widget = input.isWidget;

  const { data, error } = await supabase
    .from("viz_dashboard_charts")
    .update(payload)
    .eq("id", chartId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChart(data as ChartRow);
}

export async function deleteVizDashboardChart(chartId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("viz_dashboard_charts").delete().eq("id", chartId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function queryVizChartHistory(
  dashboardId: string,
  options: {
    roleCode: string;
    projectIds: string[];
    periodHours: number;
  },
): Promise<VizHistoryPoint[]> {
  const since = new Date(Date.now() - options.periodHours * 60 * 60 * 1000).toISOString();

  const [projects, mappings] = await Promise.all([
    listVizDashboardProjects(dashboardId),
    listVizVariableMappings(dashboardId),
  ]);

  const projectLabelById = new Map(
    projects.map((p) => [p.projectId, p.displayName ?? p.projectName ?? p.projectId]),
  );

  const relevantMappings = mappings.filter(
    (m) =>
      m.roleCode === options.roleCode &&
      options.projectIds.includes(m.projectId) &&
      m.integrationVariableId,
  );

  if (!relevantMappings.length) {
    return [];
  }

  const mappingIds = relevantMappings.map((m) => m.id);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("viz_variable_readings_history")
    .select("mapping_id, project_id, role_code, numeric_value, text_value, data_quality, measured_at")
    .eq("dashboard_id", dashboardId)
    .in("mapping_id", mappingIds)
    .gte("measured_at", since)
    .order("measured_at", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const mappingById = new Map(relevantMappings.map((m) => [m.id, m]));

  return (data ?? []).map((row) => {
    const mapping = mappingById.get(row.mapping_id as string);
    const numeric =
      row.numeric_value != null
        ? Number(row.numeric_value) * (mapping?.multiplier ?? 1) + (mapping?.offsetValue ?? 0)
        : null;

    return {
      measuredAt: row.measured_at as string,
      numericValue: numeric,
      textValue: (row.text_value as string | null) ?? null,
      dataQuality: row.data_quality as string,
      projectId: row.project_id as string,
      projectLabel: projectLabelById.get(row.project_id as string) ?? (row.project_id as string),
      roleCode: row.role_code as string,
    };
  });
}
