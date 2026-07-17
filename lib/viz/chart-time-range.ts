import type { VizChartConfig } from "@/lib/viz/chart-types";

export type VizChartTimeRange = {
  startAt: string;
  endAt: string;
};

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
