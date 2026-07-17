import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { VizDashboardChartRow } from "@/lib/supabase/database.types";
import type {
  VizChartConfig,
  VizChartType,
  VizDashboardChart,
  VizDashboardChartInput,
  VizHistoryPoint,
} from "@/lib/viz/chart-types";
import { normalizeChartConfig } from "@/lib/viz/chart-types";
import { resolveChartTimeRange } from "@/lib/viz/chart-time-range";
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
  return normalizeChartConfig(value);
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
  const config = normalizeChartConfig(input.config);
  const { data, error } = await supabase
    .from("viz_dashboard_charts")
    .insert({
      dashboard_id: dashboardId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      chart_type: input.chartType ?? "line",
      config_json: config,
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
  if (input.config !== undefined) payload.config_json = normalizeChartConfig(input.config);
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
    roleCodes: string[];
    projectIds: string[];
    periodHours?: number;
    startAt?: string;
    endAt?: string;
    dateRangeMode?: "relative" | "absolute";
  },
): Promise<VizHistoryPoint[]> {
  const roleCodes = [...new Set(options.roleCodes.filter(Boolean))];
  if (!roleCodes.length || !options.projectIds.length) {
    return [];
  }

  const range = resolveChartTimeRange({
    dateRangeMode: options.dateRangeMode,
    periodHours: options.periodHours ?? 24,
    startAt: options.startAt ?? null,
    endAt: options.endAt ?? null,
  });

  const [projects, mappings] = await Promise.all([
    listVizDashboardProjects(dashboardId),
    listVizVariableMappings(dashboardId),
  ]);

  const projectLabelById = new Map(
    projects.map((p) => [p.projectId, p.displayName ?? p.projectName ?? p.projectId]),
  );

  const relevantMappings = mappings.filter(
    (m) =>
      roleCodes.includes(m.roleCode) &&
      options.projectIds.includes(m.projectId) &&
      m.integrationVariableId,
  );

  if (!relevantMappings.length) {
    return [];
  }

  const mappingIds = relevantMappings.map((m) => m.id);
  const variableIds = [
    ...new Set(
      relevantMappings
        .map((m) => m.integrationVariableId)
        .filter(Boolean) as string[],
    ),
  ];
  const mappingById = new Map(relevantMappings.map((m) => [m.id, m]));
  const mappingByVariableId = new Map(
    relevantMappings
      .filter((m) => m.integrationVariableId)
      .map((m) => [m.integrationVariableId as string, m]),
  );

  const supabase = getSupabaseAdmin();

  const { data: historyRows, error } = await supabase
    .from("viz_variable_readings_history")
    .select("mapping_id, project_id, role_code, numeric_value, text_value, data_quality, measured_at")
    .eq("dashboard_id", dashboardId)
    .in("mapping_id", mappingIds)
    .gte("measured_at", range.startAt)
    .lte("measured_at", range.endAt)
    .order("measured_at", { ascending: true })
    .limit(8000);

  if (error) {
    throw new Error(error.message);
  }

  const points: VizHistoryPoint[] = (historyRows ?? []).map((row) => {
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

  if (points.length >= 20) {
    return points;
  }

  const { data: telemetryRows, error: telemetryError } = await supabase
    .from("project_telemetry")
    .select(
      "project_id, integration_variable_id, numeric_value, text_value, temperature, measured_at",
    )
    .in("integration_variable_id", variableIds)
    .in("project_id", options.projectIds)
    .gte("measured_at", range.startAt)
    .lte("measured_at", range.endAt)
    .order("measured_at", { ascending: true })
    .limit(8000);

  if (telemetryError) {
    return points;
  }

  const telemetryPoints: VizHistoryPoint[] = [];
  for (const row of telemetryRows ?? []) {
    const variableId = row.integration_variable_id as string | null;
    if (!variableId) {
      continue;
    }
    const mapping = mappingByVariableId.get(variableId);
    if (!mapping) {
      continue;
    }

    const rawNumeric =
      row.numeric_value != null
        ? Number(row.numeric_value)
        : row.temperature != null
          ? Number(row.temperature)
          : null;
    const numeric =
      rawNumeric != null
        ? rawNumeric * (mapping.multiplier ?? 1) + (mapping.offsetValue ?? 0)
        : null;

    telemetryPoints.push({
      measuredAt: row.measured_at as string,
      numericValue: numeric,
      textValue: (row.text_value as string | null) ?? null,
      dataQuality: "valid",
      projectId: row.project_id as string,
      projectLabel: projectLabelById.get(row.project_id as string) ?? (row.project_id as string),
      roleCode: mapping.roleCode,
    });
  }

  const seen = new Set(
    points.map(
      (point) =>
        `${point.projectId}:${point.roleCode}:${point.measuredAt}:${point.numericValue ?? "null"}`,
    ),
  );

  for (const point of telemetryPoints) {
    const key = `${point.projectId}:${point.roleCode}:${point.measuredAt}:${point.numericValue ?? "null"}`;
    if (!seen.has(key)) {
      seen.add(key);
      points.push(point);
    }
  }

  return points.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}
