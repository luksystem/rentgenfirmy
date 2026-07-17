import type { VizChartConfig, VizHistoryPoint } from "@/lib/viz/chart-types";
import { resolveChartBucketMsForRange } from "@/lib/viz/chart-time-range";

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

export function buildMultiSeriesRows(
  points: VizHistoryPoint[],
  roleNameByCode?: Map<string, string>,
  timeRange?: { startAt: string; endAt: string },
) {
  const bucketMs = timeRange
    ? resolveChartBucketMsForRange(timeRange.startAt, timeRange.endAt)
    : resolveChartBucketMs(24);
  const byTime = new Map<string, Record<string, string | number | null>>();

  const sortedPoints = [...points].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));

  for (const point of sortedPoints) {
    const bucketKey = bucketMeasuredAt(point.measuredAt, bucketMs);
    const seriesKey = historySeriesKey(point, roleNameByCode);
    const row = byTime.get(bucketKey) ?? {
      time: bucketKey,
      label: formatTimeLabel(bucketKey),
    };
    row[seriesKey] = point.numericValue;
    byTime.set(bucketKey, row);
  }

  return Array.from(byTime.values()).sort((a, b) =>
    String(a.time).localeCompare(String(b.time)),
  );
}

/** Wyrównuje odczyty wielu sklepów do wspólnych punktów osi X. */
export function resolveChartBucketMs(periodHours: number) {
  if (periodHours <= 6) {
    return 5 * 60 * 1000;
  }
  if (periodHours <= 24) {
    return 15 * 60 * 1000;
  }
  if (periodHours <= 168) {
    return 60 * 60 * 1000;
  }
  return 4 * 60 * 60 * 1000;
}

export function bucketMeasuredAt(iso: string, bucketMs: number) {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    return iso;
  }
  return new Date(Math.floor(ms / bucketMs) * bucketMs).toISOString();
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

export function parseSeriesRoleCode(
  seriesKey: string,
  roleNameByCode?: Map<string, string>,
): string | null {
  const separatorIndex = seriesKey.lastIndexOf(" · ");
  if (separatorIndex < 0) {
    return null;
  }
  const roleLabel = seriesKey.slice(separatorIndex + 3);
  if (!roleNameByCode) {
    return roleLabel;
  }
  for (const [code, name] of roleNameByCode.entries()) {
    if (name === roleLabel || code === roleLabel) {
      return code;
    }
  }
  return roleLabel;
}

export function resolveRoleUnit(
  roleCode: string,
  roleUnitByCode: Map<string, string | null | undefined>,
  configRoleUnits?: Record<string, string>,
): string | null {
  const override = configRoleUnits?.[roleCode];
  if (override) {
    return override;
  }
  const fromRole = roleUnitByCode.get(roleCode);
  return fromRole ?? null;
}

export type VizChartAxisPlan = {
  dualAxis: boolean;
  leftSeries: string[];
  rightSeries: string[];
  leftUnit: string | null;
  rightUnit: string | null;
};

export function buildChartAxisPlan(input: {
  seriesKeys: string[];
  roleNameByCode: Map<string, string>;
  roleUnitByCode: Map<string, string | null | undefined>;
  configRoleUnits?: Record<string, string>;
  dualAxis?: boolean;
}): VizChartAxisPlan {
  const unitBySeries = new Map<string, string | null>();

  for (const seriesKey of input.seriesKeys) {
    const roleCode = parseSeriesRoleCode(seriesKey, input.roleNameByCode);
    const unit =
      roleCode != null
        ? resolveRoleUnit(roleCode, input.roleUnitByCode, input.configRoleUnits)
        : null;
    unitBySeries.set(seriesKey, unit);
  }

  const distinctUnits = [
    ...new Set(
      [...unitBySeries.values()].filter((unit): unit is string => Boolean(unit?.trim())),
    ),
  ];

  const shouldDualAxis = input.dualAxis === true || distinctUnits.length > 1;
  if (!shouldDualAxis || input.seriesKeys.length <= 1) {
    return {
      dualAxis: false,
      leftSeries: input.seriesKeys,
      rightSeries: [],
      leftUnit: distinctUnits[0] ?? null,
      rightUnit: null,
    };
  }

  const leftUnit = distinctUnits[0] ?? null;
  const rightUnit = distinctUnits[1] ?? null;
  const leftSeries: string[] = [];
  const rightSeries: string[] = [];

  for (const seriesKey of input.seriesKeys) {
    const unit = unitBySeries.get(seriesKey) ?? null;
    if (unit === rightUnit) {
      rightSeries.push(seriesKey);
    } else {
      leftSeries.push(seriesKey);
    }
  }

  if (!rightSeries.length) {
    const pivot = Math.ceil(input.seriesKeys.length / 2);
    return {
      dualAxis: true,
      leftSeries: input.seriesKeys.slice(0, pivot),
      rightSeries: input.seriesKeys.slice(pivot),
      leftUnit,
      rightUnit: rightUnit ?? leftUnit,
    };
  }

  return {
    dualAxis: true,
    leftSeries,
    rightSeries,
    leftUnit,
    rightUnit,
  };
}

function formatTimeLabel(value: string) {
  return formatChartAxisTick(value);
}

export function formatChartAxisTick(value: string, spanMs?: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const span = spanMs ?? 0;
  if (span > 14 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
  }
  if (span > 48 * 60 * 60 * 1000) {
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
