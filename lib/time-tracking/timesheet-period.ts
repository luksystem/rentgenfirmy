import { endOfWeekSunday, startOfWeekMonday, toDateInputValue } from "@/lib/time-tracking/format";
import type { TimesheetPeriodType } from "@/lib/time-tracking/types";

export type TimesheetPeriodRange = {
  periodType: TimesheetPeriodType;
  dateFrom: string;
  dateTo: string;
};

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function resolveTimesheetPeriod(
  periodType: TimesheetPeriodType,
  anchor = new Date(),
): TimesheetPeriodRange {
  if (periodType === "month") {
    const from = startOfMonth(anchor);
    const to = endOfMonth(anchor);
    return {
      periodType,
      dateFrom: toDateInputValue(from),
      dateTo: toDateInputValue(to),
    };
  }

  const monday = startOfWeekMonday(anchor);
  const sunday = endOfWeekSunday(monday);
  return {
    periodType,
    dateFrom: toDateInputValue(monday),
    dateTo: toDateInputValue(sunday),
  };
}

export function formatTimesheetPeriodLabel(range: Pick<TimesheetPeriodRange, "periodType" | "dateFrom" | "dateTo">) {
  const from = new Date(`${range.dateFrom}T12:00:00`);
  const to = new Date(`${range.dateTo}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

  if (range.periodType === "month") {
    return formatter.format(from).replace(/\.$/, "");
  }

  return `${formatter.format(from).replace(/\.$/, "")} – ${formatter.format(to).replace(/\.$/, "")}`;
}
