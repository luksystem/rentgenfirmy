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
  roleCode: string;
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
  mode: "single",
  roleCode: "store_temperature",
  projectIds: [],
  periodHours: 24,
  showLegend: true,
  showTooltip: true,
};
