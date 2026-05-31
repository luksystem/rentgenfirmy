import { addDays, daysBetween, formatDate, toISODate } from "@/lib/utils";
import type { Interruption } from "@/lib/types";

export type ReportPeriodMode = "weekly" | "custom";

export type ReportPeriod = {
  mode: ReportPeriodMode;
  startDate: string;
  endDate: string;
};

export type ReportPreset = "weekly" | "last30" | "thisMonth" | "custom";

export function createWeeklyPeriod(end = new Date()): ReportPeriod {
  return {
    mode: "weekly",
    startDate: toISODate(addDays(end, -6)),
    endDate: toISODate(end),
  };
}

export function createLast30Period(end = new Date()): ReportPeriod {
  return {
    mode: "custom",
    startDate: toISODate(addDays(end, -29)),
    endDate: toISODate(end),
  };
}

export function createThisMonthPeriod(end = new Date()): ReportPeriod {
  const start = new Date(end.getFullYear(), end.getMonth(), 1);

  return {
    mode: "custom",
    startDate: toISODate(start),
    endDate: toISODate(end),
  };
}

export function createCustomPeriod(startDate: string, endDate: string): ReportPeriod {
  return {
    mode: "custom",
    startDate,
    endDate,
  };
}

export function periodFromPreset(
  preset: ReportPreset,
  customStart?: string,
  customEnd?: string,
  reference = new Date(),
): ReportPeriod {
  switch (preset) {
    case "weekly":
      return createWeeklyPeriod(reference);
    case "last30":
      return createLast30Period(reference);
    case "thisMonth":
      return createThisMonthPeriod(reference);
    case "custom":
      return createCustomPeriod(
        customStart ?? toISODate(reference),
        customEnd ?? toISODate(reference),
      );
  }
}

export function formatPeriodLabel(period: ReportPeriod) {
  if (period.mode === "weekly") {
    return `Ostatnie 7 dni (${formatDate(period.startDate)} – ${formatDate(period.endDate)})`;
  }

  return `${formatDate(period.startDate)} – ${formatDate(period.endDate)}`;
}

export function previousPeriod(period: ReportPeriod): ReportPeriod {
  const start = new Date(period.startDate);
  const lengthDays = daysBetween(period.startDate, new Date(period.endDate)) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(lengthDays - 1));

  return {
    mode: period.mode,
    startDate: toISODate(prevStart),
    endDate: toISODate(prevEnd),
  };
}

export function filterInterruptionsByPeriod(
  interruptions: Interruption[],
  period: ReportPeriod,
) {
  return interruptions.filter(
    (item) => item.date >= period.startDate && item.date <= period.endDate,
  );
}

export function validatePeriod(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return "Podaj datę początku i końca okresu.";
  }

  if (startDate > endDate) {
    return "Data początku nie może być późniejsza niż data końca.";
  }

  return null;
}

export function reportFilename(period: ReportPeriod) {
  return `rentgen-raport_${period.startDate}_${period.endDate}.pdf`;
}
