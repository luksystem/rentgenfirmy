import type { VizChartConfig } from "@/lib/viz/chart-types";

export type VizChartTimeRange = {
  startAt: string;
  endAt: string;
};

/** Domyślny zakres podglądu wykresu na dashboardzie (30 dni, koniec = teraz). */
export const VIZ_CHART_VIEWER_DEFAULT_PERIOD_HOURS = 720;

export function createViewerDefaultTimeRange(now = Date.now()): VizChartTimeRange {
  return {
    startAt: new Date(now - VIZ_CHART_VIEWER_DEFAULT_PERIOD_HOURS * 60 * 60 * 1000).toISOString(),
    endAt: new Date(now).toISOString(),
  };
}

export function resolveViewerFetchTimeRange(
  config: Pick<VizChartConfig, "dateRangeMode" | "periodHours" | "startAt" | "endAt">,
  now = Date.now(),
): VizChartTimeRange {
  if (config.dateRangeMode === "absolute" && config.startAt && config.endAt) {
    const configRange = resolveChartTimeRange(config, now);
    const defaultRange = createViewerDefaultTimeRange(now);
    return {
      startAt: new Date(
        Math.min(new Date(configRange.startAt).getTime(), new Date(defaultRange.startAt).getTime()),
      ).toISOString(),
      endAt: new Date(
        Math.max(new Date(configRange.endAt).getTime(), new Date(defaultRange.endAt).getTime()),
      ).toISOString(),
    };
  }

  const hours = Math.max(
    config.periodHours > 0 ? config.periodHours : 24,
    VIZ_CHART_VIEWER_DEFAULT_PERIOD_HOURS,
  );
  return {
    startAt: new Date(now - hours * 60 * 60 * 1000).toISOString(),
    endAt: new Date(now).toISOString(),
  };
}

export function formatChartTimeRangeLabel(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }
  const sameDay = start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  if (sameDay) {
    return `${start.toLocaleDateString("pl-PL", dateOpts)}, ${start.toLocaleTimeString("pl-PL", timeOpts)} – ${end.toLocaleTimeString("pl-PL", timeOpts)}`;
  }
  return `${start.toLocaleString("pl-PL", { ...dateOpts, ...timeOpts })} – ${end.toLocaleString("pl-PL", { ...dateOpts, ...timeOpts })}`;
}

export function filterPointsInRange<T extends { measuredAt: string }>(
  points: T[],
  range: VizChartTimeRange,
): T[] {
  const startMs = new Date(range.startAt).getTime();
  const endMs = new Date(range.endAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return points;
  }
  return points.filter((point) => {
    const ms = new Date(point.measuredAt).getTime();
    return !Number.isNaN(ms) && ms >= startMs && ms <= endMs;
  });
}

export function resolveChartTimeRange(
  config: Pick<VizChartConfig, "dateRangeMode" | "periodHours" | "startAt" | "endAt">,
  now = Date.now(),
): VizChartTimeRange {
  if (config.dateRangeMode === "absolute" && config.startAt && config.endAt) {
    const startMs = new Date(config.startAt).getTime();
    const endMs = new Date(config.endAt).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      return {
        startAt: new Date(startMs).toISOString(),
        endAt: new Date(endMs).toISOString(),
      };
    }
  }

  const hours = config.periodHours > 0 ? config.periodHours : 24;
  return {
    startAt: new Date(now - hours * 60 * 60 * 1000).toISOString(),
    endAt: new Date(now).toISOString(),
  };
}

export function resolveChartBucketMsForRange(startAt: string, endAt: string) {
  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  const spanHours = Math.max(1, (endMs - startMs) / (60 * 60 * 1000));

  if (spanHours <= 6) {
    return 5 * 60 * 1000;
  }
  if (spanHours <= 24) {
    return 15 * 60 * 1000;
  }
  if (spanHours <= 168) {
    return 60 * 60 * 1000;
  }
  return 4 * 60 * 60 * 1000;
}

/** Format dla input[type=datetime-local] */
export function toDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}
