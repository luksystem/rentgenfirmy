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

export function shiftTimesheetPeriod(
  range: TimesheetPeriodRange,
  direction: -1 | 1,
): TimesheetPeriodRange {
  const anchor = new Date(`${range.dateFrom}T12:00:00`);

  if (range.periodType === "month") {
    anchor.setMonth(anchor.getMonth() + direction);
    return resolveTimesheetPeriod("month", anchor);
  }

  anchor.setDate(anchor.getDate() + direction * 7);
  return resolveTimesheetPeriod("week", anchor);
}

export function eachDateInRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);

  while (cursor <= end) {
    dates.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
