import type { VizChartConfig, VizHistoryPoint } from "@/lib/viz/chart-types";

export function normalizeRoleCodes(config: Pick<VizChartConfig, "roleCode" | "roleCodes">): string[] {
  if (config.roleCodes?.length) {
    return config.roleCodes;
  }
  if (config.roleCode) {
    return [config.roleCode];
  }
  return ["store_temperature"];
}

export function historySeriesKey(point: VizHistoryPoint, roleNameByCode?: Map<string, string>) {
  const roleLabel = roleNameByCode?.get(point.roleCode) ?? point.roleCode;
  return `${point.projectLabel} · ${roleLabel}`;
}

export function filterHistoryPoints(
  points: VizHistoryPoint[],
  enabledProjectIds: Set<string>,
  enabledRoleCodes: Set<string>,
) {
  return points.filter(
    (point) => enabledProjectIds.has(point.projectId) && enabledRoleCodes.has(point.roleCode),
  );
}

export function buildMultiSeriesRows(points: VizHistoryPoint[], roleNameByCode?: Map<string, string>) {
  const byTime = new Map<string, Record<string, string | number | null>>();

  for (const point of points) {
    const seriesKey = historySeriesKey(point, roleNameByCode);
    const row = byTime.get(point.measuredAt) ?? {
      time: point.measuredAt,
      label: formatTimeLabel(point.measuredAt),
    };
    row[seriesKey] = point.numericValue;
    byTime.set(point.measuredAt, row);
  }

  return Array.from(byTime.values()).sort((a, b) =>
    String(a.time).localeCompare(String(b.time)),
  );
}

export function uniqueSeriesKeys(points: VizHistoryPoint[], roleNameByCode?: Map<string, string>) {
  return [...new Set(points.map((point) => historySeriesKey(point, roleNameByCode)))].sort();
}

export function uniqueProjectIds(points: VizHistoryPoint[]) {
  return [...new Set(points.map((point) => point.projectId))];
}

export function uniqueRoleCodes(points: VizHistoryPoint[]) {
  return [...new Set(points.map((point) => point.roleCode))];
}

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
