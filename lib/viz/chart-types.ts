export const VIZ_CHART_TYPES = ["line", "area", "bar", "mixed"] as const;
export type VizChartType = (typeof VIZ_CHART_TYPES)[number];

export const VIZ_CHART_MODES = ["single", "compare"] as const;
export type VizChartMode = (typeof VIZ_CHART_MODES)[number];

export const VIZ_CHART_PERIODS = [
  { hours: 6, label: "6 godzin" },
  { hours: 24, label: "24 godziny" },
  { hours: 168, label: "7 dni" },
  { hours: 720, label: "30 dni" },
] as const;

export type VizChartConfig = {
  mode: VizChartMode;
  /** @deprecated Użyj roleCodes */
  roleCode?: string;
  roleCodes: string[];
  projectIds: string[];
  periodHours: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  yAxisMin?: number | null;
  yAxisMax?: number | null;
  unit?: string | null;
  seriesColors?: Record<string, string>;
};

export type VizDashboardChart = {
  id: string;
  dashboardId: string;
  name: string;
  description: string | null;
  chartType: VizChartType;
  config: VizChartConfig;
  sortOrder: number;
  isWidget: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VizDashboardChartInput = {
  name: string;
  description?: string | null;
  chartType?: VizChartType;
  config: VizChartConfig;
  sortOrder?: number;
  isWidget?: boolean;
};

export type VizHistoryPoint = {
  measuredAt: string;
  numericValue: number | null;
  textValue: string | null;
  dataQuality: string;
  projectId: string;
  projectLabel: string;
  roleCode: string;
};

export const DEFAULT_VIZ_CHART_CONFIG: VizChartConfig = {
  mode: "compare",
  roleCodes: ["store_temperature"],
  projectIds: [],
  periodHours: 24,
  showLegend: true,
  showTooltip: true,
};

export function normalizeChartConfig(value: unknown): VizChartConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_VIZ_CHART_CONFIG };
  }

  const raw = value as Record<string, unknown>;
  const roleCodes = Array.isArray(raw.roleCodes)
    ? raw.roleCodes.filter((code): code is string => typeof code === "string")
    : typeof raw.roleCode === "string"
      ? [raw.roleCode]
      : DEFAULT_VIZ_CHART_CONFIG.roleCodes;

  return {
    mode: raw.mode === "single" ? "single" : "compare",
    roleCode: roleCodes[0],
    roleCodes,
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
