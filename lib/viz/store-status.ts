import type { VizDataQuality } from "@/lib/viz/types";

export const VIZ_STORE_STATUS_CODES = [
  "unconfigured",
  "no_communication",
  "alarm",
  "warning",
  "work_in_progress",
  "ok",
] as const;

export type VizStoreStatusCode = (typeof VIZ_STORE_STATUS_CODES)[number];

export const VIZ_STORE_STATUS_LABELS: Record<VizStoreStatusCode, string> = {
  unconfigured: "Brak konfiguracji",
  no_communication: "Brak komunikacji",
  alarm: "Alarm",
  warning: "Ostrzeżenie",
  work_in_progress: "Prowadzone prace",
  ok: "Poprawnie",
};

export type VizStoreStatusInput = {
  hasMappings: boolean;
  miniserverOnline: boolean | null;
  dataQuality: VizDataQuality | null;
  activeAlarmCount: number | null;
  systemErrorCount: number | null;
  openServiceRequests: number;
  workInProgress: boolean;
  staleMinutes: number | null;
  staleThresholdMinutes?: number;
  externalWarning?: boolean;
};

export type VizStoreStatus = {
  code: VizStoreStatusCode;
  label: string;
  tone: "neutral" | "active" | "waiting" | "critical" | "blue" | "closed";
};

const DEFAULT_STALE_MINUTES = 15;

export function resolveVizStoreStatus(input: VizStoreStatusInput): VizStoreStatus {
  const staleThreshold = input.staleThresholdMinutes ?? DEFAULT_STALE_MINUTES;

  if (!input.hasMappings) {
    return { code: "unconfigured", label: VIZ_STORE_STATUS_LABELS.unconfigured, tone: "closed" };
  }

  if (input.miniserverOnline === false || input.dataQuality === "no_communication") {
    return {
      code: "no_communication",
      label: VIZ_STORE_STATUS_LABELS.no_communication,
      tone: "closed",
    };
  }

  if ((input.activeAlarmCount ?? 0) > 0) {
    return { code: "alarm", label: VIZ_STORE_STATUS_LABELS.alarm, tone: "critical" };
  }

  if ((input.systemErrorCount ?? 0) > 0) {
    return { code: "alarm", label: VIZ_STORE_STATUS_LABELS.alarm, tone: "critical" };
  }

  if (
    input.dataQuality === "stale" ||
    input.dataQuality === "read_error" ||
    input.externalWarning ||
    (input.staleMinutes != null && input.staleMinutes > staleThreshold)
  ) {
    return { code: "warning", label: VIZ_STORE_STATUS_LABELS.warning, tone: "waiting" };
  }

  if (input.workInProgress) {
    return {
      code: "work_in_progress",
      label: VIZ_STORE_STATUS_LABELS.work_in_progress,
      tone: "blue",
    };
  }

  if (input.dataQuality === "valid" || input.miniserverOnline === true) {
    return { code: "ok", label: VIZ_STORE_STATUS_LABELS.ok, tone: "active" };
  }

  if (input.dataQuality === "unconfigured") {
    return { code: "unconfigured", label: VIZ_STORE_STATUS_LABELS.unconfigured, tone: "closed" };
  }

  return { code: "warning", label: VIZ_STORE_STATUS_LABELS.warning, tone: "waiting" };
}

export function formatMappedValue(
  numericValue: number | null,
  textValue: string | null,
  options?: {
    unit?: string | null;
    decimalPlaces?: number;
    multiplier?: number;
    offsetValue?: number;
    missingLabel?: string;
  },
): string {
  if (numericValue == null && !textValue) {
    return options?.missingLabel ?? "—";
  }

  if (numericValue != null) {
    const multiplier = options?.multiplier ?? 1;
    const offset = options?.offsetValue ?? 0;
    const decimalPlaces = options?.decimalPlaces ?? 1;
    const transformed = numericValue * multiplier + offset;
    const formatted = transformed.toFixed(decimalPlaces);
    return options?.unit ? `${formatted} ${options.unit}` : formatted;
  }

  return textValue ?? "—";
}

export function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) {
    return null;
  }
  return Math.max(0, Math.round((Date.now() - ts) / 60_000));
}
