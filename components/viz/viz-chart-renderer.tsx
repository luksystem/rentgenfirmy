"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CHART_COLORS } from "@/components/chart-colors";
import {
  buildChartAxisPlan,
  buildMultiSeriesRows,
  filterHistoryPoints,
  formatChartAxisTick,
  uniqueRoleCodes,
  uniqueSeriesKeys,
} from "@/lib/viz/chart-series";
import { normalizeChartConfig, type VizDashboardChart, type VizHistoryPoint } from "@/lib/viz/chart-types";
import {
  createViewerDefaultTimeRange,
  filterPointsInRange,
  formatChartTimeRangeLabel,
  resolveChartTimeRange,
  resolveViewerFetchTimeRange,
  type VizChartTimeRange,
} from "@/lib/viz/chart-time-range";
import { LIVE_POLL_MS } from "@/store/viz-dashboard-cache-store";
import { useVizStore } from "@/store/viz-store";

type VizChartRendererProps = {
  dashboardId: string;
  chart: VizDashboardChart;
  interactive?: boolean;
  canPersistToggles?: boolean;
  /** Podgląd na dashboardzie: domyślnie miesiąc kończący się „teraz” + zoom przeciąganiem. */
  enableViewerTimeRange?: boolean;
};

type ChartSelection = {
  left: string;
  right: string;
};

const MIN_ZOOM_SPAN_MS = 5 * 60 * 1000;

function seriesColor(seriesKey: string, index: number, overrides?: Record<string, string>) {
  return overrides?.[seriesKey] ?? CHART_COLORS[index % CHART_COLORS.length];
}

function initialEnabledSet(values: string[], saved?: string[]) {
  if (saved?.length) {
    const allowed = new Set(values);
    const filtered = saved.filter((value) => allowed.has(value));
    if (filtered.length) {
      return new Set(filtered);
    }
  }
  return new Set(values);
}

export function VizChartRenderer({
  dashboardId,
  chart,
  interactive = true,
  canPersistToggles = false,
  enableViewerTimeRange = true,
}: VizChartRendererProps) {
  const variableRoles = useVizStore((s) => s.variableRoles);
  const [points, setPoints] = useState<VizHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => normalizeChartConfig(chart.config), [chart.config]);
  const configTimeRange = useMemo(() => resolveChartTimeRange(config), [config]);
  const fetchTimeRange = useMemo(
    () =>
      enableViewerTimeRange && interactive
        ? resolveViewerFetchTimeRange(config)
        : configTimeRange,
    [config, configTimeRange, enableViewerTimeRange, interactive],
  );

  const [viewerRange, setViewerRange] = useState<VizChartTimeRange>(() =>
    enableViewerTimeRange && interactive ? createViewerDefaultTimeRange() : configTimeRange,
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const isZoomedRef = useRef(false);
  const [selection, setSelection] = useState<ChartSelection | null>(null);
  const isSelectingRef = useRef(false);

  const displayTimeRange = enableViewerTimeRange && interactive ? viewerRange : configTimeRange;
  const viewerSpanMs = useMemo(() => {
    const startMs = new Date(displayTimeRange.startAt).getTime();
    const endMs = new Date(displayTimeRange.endAt).getTime();
    return Math.max(0, endMs - startMs);
  }, [displayTimeRange.endAt, displayTimeRange.startAt]);

  const roleNameByCode = useMemo(
    () => new Map(variableRoles.map((role) => [role.code, role.name])),
    [variableRoles],
  );
  const roleUnitByCode = useMemo(
    () => new Map(variableRoles.map((role) => [role.code, role.defaultUnit])),
    [variableRoles],
  );

  const [enabledProjectIds, setEnabledProjectIds] = useState<Set<string>>(() =>
    initialEnabledSet(config.projectIds, config.enabledProjectIds),
  );
  const [enabledRoleCodes, setEnabledRoleCodes] = useState<Set<string>>(() =>
    initialEnabledSet(config.roleCodes, config.enabledRoleCodes),
  );

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEnabledProjectIds(initialEnabledSet(config.projectIds, config.enabledProjectIds));
    setEnabledRoleCodes(initialEnabledSet(config.roleCodes, config.enabledRoleCodes));
  }, [chart.id, config.projectIds, config.roleCodes, config.enabledProjectIds, config.enabledRoleCodes]);

  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  useEffect(() => {
    setIsZoomed(false);
    isZoomedRef.current = false;
    setSelection(null);
    isSelectingRef.current = false;
    if (enableViewerTimeRange && interactive) {
      setViewerRange(createViewerDefaultTimeRange());
    } else {
      setViewerRange(configTimeRange);
    }
  }, [chart.id, configTimeRange, enableViewerTimeRange, interactive]);

  const loadHistory = useCallback(async () => {
    if (!config.projectIds.length || !config.roleCodes.length) {
      setPoints([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const params = new URLSearchParams({
        history: "1",
        roleCodes: config.roleCodes.join(","),
        projectIds: config.projectIds.join(","),
        periodHours: String(config.periodHours),
        dateRangeMode: "absolute",
        startAt: fetchTimeRange.startAt,
        endAt: fetchTimeRange.endAt,
      });
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/charts?${params}`);
      if (!response.ok) {
        throw new Error("Nie udało się pobrać historii.");
      }
      const data = (await response.json()) as { points: VizHistoryPoint[] };
      setPoints(data.points);

      if (enableViewerTimeRange && interactive && !isZoomedRef.current) {
        setViewerRange(createViewerDefaultTimeRange());
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd wykresu.");
    } finally {
      setIsLoading(false);
    }
  }, [
    dashboardId,
    config.periodHours,
    config.projectIds,
    config.roleCodes,
    fetchTimeRange.endAt,
    fetchTimeRange.startAt,
    enableViewerTimeRange,
    interactive,
  ]);

  useEffect(() => {
    setIsLoading(true);
    void loadHistory();

    const interval = window.setInterval(() => {
      void loadHistory();
    }, LIVE_POLL_MS);

    return () => window.clearInterval(interval);
  }, [loadHistory, chart.id]);

  const persistToggles = useCallback(
    (nextProjectIds: Set<string>, nextRoleCodes: Set<string>) => {
      if (!canPersistToggles || !interactive) {
        return;
      }

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }

      persistTimerRef.current = setTimeout(() => {
        void fetch(`/api/viz/dashboards/${dashboardId}/charts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: chart.id,
            config: {
              ...config,
              enabledProjectIds: [...nextProjectIds],
              enabledRoleCodes: [...nextRoleCodes],
            },
          }),
        });
      }, 600);
    },
    [canPersistToggles, chart.id, config, dashboardId, interactive],
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    },
    [],
  );

  const filteredPoints = useMemo(
    () => filterHistoryPoints(points, enabledProjectIds, enabledRoleCodes),
    [points, enabledProjectIds, enabledRoleCodes],
  );

  const displayPoints = useMemo(
    () => filterPointsInRange(filteredPoints, displayTimeRange),
    [filteredPoints, displayTimeRange],
  );

  const seriesLabels = useMemo(
    () => uniqueSeriesKeys(displayPoints, roleNameByCode),
    [displayPoints, roleNameByCode],
  );

  const rows = useMemo(
    () => buildMultiSeriesRows(displayPoints, roleNameByCode, displayTimeRange),
    [displayPoints, roleNameByCode, displayTimeRange],
  );

  const axisPlan = useMemo(
    () =>
      buildChartAxisPlan({
        seriesKeys: seriesLabels,
        roleNameByCode,
        roleUnitByCode,
        configRoleUnits: config.roleUnits,
        dualAxis: config.dualAxis,
      }),
    [seriesLabels, roleNameByCode, roleUnitByCode, config.roleUnits, config.dualAxis],
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
      persistToggles(next, enabledRoleCodes);
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
      persistToggles(enabledProjectIds, next);
      return next;
    });
  }

  function resetViewerRange() {
    setIsZoomed(false);
    isZoomedRef.current = false;
    setSelection(null);
    isSelectingRef.current = false;
    setViewerRange(createViewerDefaultTimeRange());
  }

  function applyChartSelection() {
    if (!selection) {
      isSelectingRef.current = false;
      return;
    }

    const leftMs = new Date(selection.left).getTime();
    const rightMs = new Date(selection.right).getTime();
    if (Number.isNaN(leftMs) || Number.isNaN(rightMs) || Math.abs(rightMs - leftMs) < MIN_ZOOM_SPAN_MS) {
      setSelection(null);
      isSelectingRef.current = false;
      return;
    }

    setViewerRange({
      startAt: new Date(Math.min(leftMs, rightMs)).toISOString(),
      endAt: new Date(Math.max(leftMs, rightMs)).toISOString(),
    });
    setIsZoomed(true);
    isZoomedRef.current = true;
    setSelection(null);
    isSelectingRef.current = false;
  }

  function handleChartMouseDown(state: { activeLabel?: string | number }) {
    if (!interactive || !enableViewerTimeRange || !state?.activeLabel) {
      return;
    }
    const label = String(state.activeLabel);
    isSelectingRef.current = true;
    setSelection({ left: label, right: label });
  }

  function handleChartMouseMove(state: { activeLabel?: string | number }) {
    if (!isSelectingRef.current || !state?.activeLabel) {
      return;
    }
    const label = String(state.activeLabel);
    setSelection((current) => (current ? { ...current, right: label } : null));
  }

  const missingProjects =
    config.projectIds.length - new Set(points.map((p) => p.projectId)).size;

  const chartMouseHandlers =
    interactive && enableViewerTimeRange
      ? {
          onMouseDown: handleChartMouseDown,
          onMouseMove: handleChartMouseMove,
          onMouseUp: applyChartSelection,
          onMouseLeave: applyChartSelection,
        }
      : {};

  function renderSeries(chartType: VizDashboardChart["chartType"]) {
    return seriesLabels.map((label, index) => {
      const color = seriesColor(label, index, config.seriesColors);
      const yAxisId = axisPlan.dualAxis
        ? axisPlan.rightSeries.includes(label)
          ? "right"
          : "left"
        : undefined;
      const common = {
        dataKey: label,
        ...(yAxisId ? { yAxisId } : {}),
      };

      if (chartType === "bar") {
        return <Bar key={label} {...common} fill={color} />;
      }
      if (chartType === "area") {
        return (
          <Area
            key={label}
            {...common}
            type="monotone"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            connectNulls
          />
        );
      }
      return (
        <Line
          key={label}
          {...common}
          type="monotone"
          stroke={color}
          dot={false}
          strokeWidth={2}
          connectNulls
        />
      );
    });
  }

  function renderChartChrome(chartType: VizDashboardChart["chartType"]) {
    return (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          minTickGap={24}
          tickFormatter={(value) => formatChartAxisTick(String(value), viewerSpanMs)}
        />
        <YAxis
          {...(axisPlan.dualAxis ? { yAxisId: "left" } : {})}
          domain={[config.yAxisMin ?? "auto", config.yAxisMax ?? "auto"]}
          tick={{ fontSize: 11 }}
          label={
            axisPlan.dualAxis && axisPlan.leftUnit
              ? { value: axisPlan.leftUnit, angle: -90, position: "insideLeft", fontSize: 10 }
              : undefined
          }
        />
        {axisPlan.dualAxis ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={["auto", "auto"]}
            tick={{ fontSize: 11 }}
            label={
              axisPlan.rightUnit
                ? { value: axisPlan.rightUnit, angle: 90, position: "insideRight", fontSize: 10 }
                : undefined
            }
          />
        ) : null}
        {config.showTooltip !== false ? (
          <Tooltip
            labelFormatter={(value) => formatChartAxisTick(String(value), viewerSpanMs)}
          />
        ) : null}
        {config.showLegend !== false ? <Legend /> : null}
        {selection ? (
          <ReferenceArea
            x1={selection.left}
            x2={selection.right}
            stroke="hsl(var(--accent))"
            strokeOpacity={0.6}
            fill="hsl(var(--accent))"
            fillOpacity={0.12}
          />
        ) : null}
        {renderSeries(chartType)}
      </>
    );
  }

  const chartBody =
    chart.chartType === "bar" ? (
      <BarChart data={rows} {...chartMouseHandlers}>
        {renderChartChrome("bar")}
      </BarChart>
    ) : chart.chartType === "area" ? (
      <AreaChart data={rows} {...chartMouseHandlers}>
        {renderChartChrome("area")}
      </AreaChart>
    ) : (
      <LineChart data={rows} {...chartMouseHandlers}>
        {renderChartChrome("line")}
      </LineChart>
    );

  const periodLabel =
    enableViewerTimeRange && interactive
      ? formatChartTimeRangeLabel(displayTimeRange.startAt, displayTimeRange.endAt)
      : config.dateRangeMode === "absolute"
        ? formatChartTimeRangeLabel(configTimeRange.startAt, configTimeRange.endAt)
        : `${config.periodHours}h`;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{chart.name}</h3>
            {chart.description ? <p className="text-sm text-muted">{chart.description}</p> : null}
          </div>
          {enableViewerTimeRange && interactive && isZoomed ? (
            <button
              type="button"
              onClick={resetViewerRange}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Pełny miesiąc
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted">
          Zmienne: {config.roleCodes.map((code) => roleNameByCode.get(code) ?? code).join(", ")} ·
          Okres: {periodLabel}
          {axisPlan.dualAxis ? " · Dwie osie Y" : ""}
          {missingProjects > 0 ? ` · ${missingProjects} sklep(ów) bez danych` : ""}
        </p>
        {enableViewerTimeRange && interactive ? (
          <p className="mt-1 text-xs text-muted/80">
            Przeciągnij na wykresie, aby powiększyć wybrany zakres czasu.
          </p>
        ) : null}
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
          Brak danych historycznych dla wybranej konfiguracji ({formatChartTimeRangeLabel(displayTimeRange.startAt, displayTimeRange.endAt)}).
          Upewnij się, że mapowania zmiennych są skonfigurowane i sync telemetrii Loxone działa.
        </p>
      ) : (
        <div
          className={`h-72 w-full ${enableViewerTimeRange && interactive ? "cursor-crosshair" : ""}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartBody}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
