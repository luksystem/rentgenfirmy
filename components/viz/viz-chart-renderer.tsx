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
import type { VizDashboardChart, VizHistoryPoint } from "@/lib/viz/chart-types";

function formatTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildChartRows(points: VizHistoryPoint[], mode: VizDashboardChart["config"]["mode"]) {
  if (mode === "compare") {
    const byTime = new Map<string, Record<string, string | number | null>>();
    for (const point of points) {
      const key = point.measuredAt;
      const row = byTime.get(key) ?? { time: key, label: formatTimeLabel(key) };
      row[point.projectLabel] = point.numericValue;
      byTime.set(key, row);
    }
    return Array.from(byTime.values());
  }

  return points.map((point) => ({
    time: point.measuredAt,
    label: formatTimeLabel(point.measuredAt),
    value: point.numericValue,
  }));
}

type VizChartRendererProps = {
  dashboardId: string;
  chart: VizDashboardChart;
};

export function VizChartRenderer({ dashboardId, chart }: VizChartRendererProps) {
  const [points, setPoints] = useState<VizHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      if (!chart.config.projectIds.length) {
        setPoints([]);
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          history: "1",
          roleCode: chart.config.roleCode,
          projectIds: chart.config.projectIds.join(","),
          periodHours: String(chart.config.periodHours),
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
  }, [dashboardId, chart]);

  const seriesLabels = useMemo(() => {
    if (chart.config.mode === "single") {
      return ["value"];
    }
    return [...new Set(points.map((p) => p.projectLabel))];
  }, [chart.config.mode, points]);

  const rows = useMemo(
    () => buildChartRows(points, chart.config.mode),
    [points, chart.config.mode],
  );

  const missingProjects = chart.config.projectIds.length - new Set(points.map((p) => p.projectId)).size;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="font-semibold">{chart.name}</h3>
        {chart.description ? <p className="text-sm text-muted">{chart.description}</p> : null}
        <p className="mt-1 text-xs text-muted">
          Rola: {chart.config.roleCode} · Okres: {chart.config.periodHours}h
          {missingProjects > 0 ? ` · ${missingProjects} sklep(ów) bez danych` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Ładowanie wykresu…
        </div>
      ) : error ? (
        <p className="py-8 text-sm text-rose-300">{error}</p>
      ) : !rows.length ? (
        <p className="py-8 text-sm text-muted">
          Brak danych historycznych dla wybranej roli i sklepów. Upewnij się, że mapowania są
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
                  domain={[chart.config.yAxisMin ?? "auto", chart.config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {chart.config.showTooltip !== false ? <Tooltip /> : null}
                {chart.config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Bar key={label} dataKey={label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </BarChart>
            ) : chart.chartType === "area" ? (
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={[chart.config.yAxisMin ?? "auto", chart.config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {chart.config.showTooltip !== false ? <Tooltip /> : null}
                {chart.config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Area
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    fillOpacity={0.15}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis
                  domain={[chart.config.yAxisMin ?? "auto", chart.config.yAxisMax ?? "auto"]}
                  tick={{ fontSize: 11 }}
                />
                {chart.config.showTooltip !== false ? <Tooltip /> : null}
                {chart.config.showLegend !== false ? <Legend /> : null}
                {seriesLabels.map((label, index) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
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
