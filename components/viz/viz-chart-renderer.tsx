"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CHART_COLORS } from "@/components/charts";
import {
  buildMultiSeriesRows,
  filterHistoryPoints,
  uniqueRoleCodes,
  uniqueSeriesKeys,
} from "@/lib/viz/chart-series";
import { normalizeChartConfig, type VizDashboardChart, type VizHistoryPoint } from "@/lib/viz/chart-types";
import { useVizStore } from "@/store/viz-store";

type VizChartRendererProps = {
  dashboardId: string;
  chart: VizDashboardChart;
  interactive?: boolean;
};

function seriesColor(seriesKey: string, index: number, overrides?: Record<string, string>) {
  return overrides?.[seriesKey] ?? CHART_COLORS[index % CHART_COLORS.length];
}

export function VizChartRenderer({
  dashboardId,
  chart,
  interactive = true,
}: VizChartRendererProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const [points, setPoints] = useState<VizHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => normalizeChartConfig(chart.config), [chart.config]);
  const roleNameByCode = useMemo(
    () => new Map(variableRoles.map((role) => [role.code, role.name])),
    [variableRoles],
  );

  const [enabledProjectIds, setEnabledProjectIds] = useState<Set<string>>(
    () => new Set(config.projectIds),
  );
  const [enabledRoleCodes, setEnabledRoleCodes] = useState<Set<string>>(
    () => new Set(config.roleCodes),
  );

  useEffect(() => {
    setEnabledProjectIds(new Set(config.projectIds));
    setEnabledRoleCodes(new Set(config.roleCodes));
  }, [chart.id, config.projectIds, config.roleCodes]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      if (!config.projectIds.length || !config.roleCodes.length) {
        setPoints([]);
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          history: "1",
          roleCodes: config.roleCodes.join(","),
          projectIds: config.projectIds.join(","),
          periodHours: String(config.periodHours),
        });
        const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts?${params}`);
        if (!response.ok) {
          throw new Error("Nie udało się pobrać historii.");
        }
        const data = (await response.json()) as { points: VizHistoryPoint[] };
        setPoints(data.points);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd wykresu.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [dashboardId, chart.id, config.periodHours, config.projectIds, config.roleCodes]);

  const filteredPoints = useMemo(
    () => filterHistoryPoints(points, enabledProjectIds, enabledRoleCodes),
    [points, enabledProjectIds, enabledRoleCodes],
  );

  const seriesLabels = useMemo(
    () => uniqueSeriesKeys(filteredPoints, roleNameByCode),
    [filteredPoints, roleNameByCode],
  );

  const rows = useMemo(
    () => buildMultiSeriesRows(filteredPoints, roleNameByCode),
    [filteredPoints, roleNameByCode],
  );

  const availableProjects = useMemo(() => {
    const byId = new Map<string, string>();
    for (const point of points) {
      byId.set(point.projectId, point.projectLabel);
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1], "pl"));
  }, [points]);

  const availableRoleCodes = useMemo(() => {
    const fromConfig = config.roleCodes;
    const fromData = uniqueRoleCodes(points);
    return [...new Set([...fromConfig, ...fromData])];
  }, [config.roleCodes, points]);

  function toggleProject(projectId: string) {
    setEnabledProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function toggleRole(roleCode: string) {
    setEnabledRoleCodes((current) => {
      const next = new Set(current);
      if (next.has(roleCode)) {
        next.delete(roleCode);
      } else {
        next.add(roleCode);
      }
      return next;
    });
  }

  const missingProjects =
    config.projectIds.length - new Set(points.map((p) => p.projectId)).size;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="font-semibold">{chart.name}</h3>
        {chart.description ? <p className="text-sm text-muted">{chart.description}</p> : null}
        <p className="mt-1 text-xs text-muted">
          Zmienne: {config.roleCodes.map((code) => roleNameByCode.get(code) ?? code).join(", ")} ·
          Okres: {config.periodHours}h
          {missingProjects > 0 ? ` · ${missingProjects} sklep(ów) bez danych` : ""}
        </p>
      </div>

      {interactive && (availableProjects.length > 1 || availableRoleCodes.length > 1) ? (
        <div className="mb-3 space-y-2">
          {availableProjects.length > 1 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Sklepy</p>
              <div className="flex flex-wrap gap-1.5">
                {availableProjects.map(([projectId, label]) => {
                  const active = enabledProjectIds.has(projectId);
                  return (
                    <button
                      key={projectId}
                      type="button"
                      onClick={() => toggleProject(projectId)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-muted text-muted line-through opacity-60"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {availableRoleCodes.length > 1 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Zmienne</p>
              <div className="flex flex-wrap gap-1.5">
                {availableRoleCodes.map((roleCode) => {
                  const active = enabledRoleCodes.has(roleCode);
                  return (
                    <button
                      key={roleCode}
                      type="button"
                      onClick={() => toggleRole(roleCode)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border bg-surface-muted text-muted line-through opacity-60"
                      }`}
                    >
                      {roleNameByCode.get(roleCode) ?? roleCode}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Ładowanie wykresu…
        </div>
      ) : error ? (
        <p className="py-8 text-sm text-rose-300">{error}</p>
      ) : !rows.length ? (
        <p className="py-8 text-sm text-muted">
          Brak danych historycznych dla wybranej konfiguracji. Upewnij się, że mapowania są
          skonfigurowane i sync telemetrii działa.
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.chartType === "bar" ? (
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={[config.yAxisMin ?? "auto", config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {config.showTooltip !== false ? <Tooltip /> : null}
                {config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Bar
                    key={label}
                    dataKey={label}
                    fill={seriesColor(label, index, config.seriesColors)}
                  />
                ))}
              </BarChart>
            ) : chart.chartType === "area" ? (
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={[config.yAxisMin ?? "auto", config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {config.showTooltip !== false ? <Tooltip /> : null}
                {config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={seriesColor(label, index, config.seriesColors)}
                    fill={seriesColor(label, index, config.seriesColors)}
                    fillOpacity={0.15}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={[config.yAxisMin ?? "auto", config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {config.showTooltip !== false ? <Tooltip /> : null}
                {config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={seriesColor(label, index, config.seriesColors)}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
