import { buildWeekTimeReport, type WeekTimeReport } from "@/lib/time-tracking/reports";
import { buildWorkPeriodBalance, type WorkPeriodBalance } from "@/lib/time-tracking/period-balance";
import { eachDateInRange } from "@/lib/time-tracking/timesheet-period";
import type { TimeEntryView, TimesheetView } from "@/lib/time-tracking/types";

export type DailyTimeSummary = {
  date: string;
  totalMinutes: number;
  workMinutes: number;
  absenceMinutes: number;
  billableMinutes: number;
  entryCount: number;
};

export type PeriodTimeReport = WeekTimeReport;

export type TimesheetSummary = {
  timesheet: TimesheetView | null;
  entries: TimeEntryView[];
  report: PeriodTimeReport;
  dailyBreakdown: DailyTimeSummary[];
  balance: WorkPeriodBalance;
};

export function buildDailyTimeBreakdown(
  entries: TimeEntryView[],
  dateFrom: string,
  dateTo: string,
  entryTypeMeta: Array<{
    id: string;
    countsAsWork: boolean;
    countsAsAbsence: boolean;
  }>,
): DailyTimeSummary[] {
  const typeMeta = new Map(entryTypeMeta.map((item) => [item.id, item]));
  const totalsByDate = new Map<string, DailyTimeSummary>();

  for (const date of eachDateInRange(dateFrom, dateTo)) {
    totalsByDate.set(date, {
      date,
      totalMinutes: 0,
      workMinutes: 0,
      absenceMinutes: 0,
      billableMinutes: 0,
      entryCount: 0,
    });
  }

  for (const entry of entries) {
    const day =
      totalsByDate.get(entry.date) ??
      ({
        date: entry.date,
        totalMinutes: 0,
        workMinutes: 0,
        absenceMinutes: 0,
        billableMinutes: 0,
        entryCount: 0,
      } satisfies DailyTimeSummary);

    day.totalMinutes += entry.durationMinutes;
    day.entryCount += 1;
    if (entry.billable) {
      day.billableMinutes += entry.durationMinutes;
    }

    const type = typeMeta.get(entry.entryTypeId);
    if (type?.countsAsAbsence) {
      day.absenceMinutes += entry.durationMinutes;
    } else if (type?.countsAsWork ?? true) {
      day.workMinutes += entry.durationMinutes;
    }

    totalsByDate.set(entry.date, day);
  }

  return [...totalsByDate.values()];
}

export function buildTimesheetSummary(
  timesheet: TimesheetView | null,
  entries: TimeEntryView[],
  dateFrom: string,
  dateTo: string,
  entryTypeMeta: Array<{
    id: string;
    name: string;
    countsAsWork: boolean;
    countsAsAbsence: boolean;
  }>,
  dailyHoursLimit?: number | null,
): TimesheetSummary {
  const report = buildWeekTimeReport(entries, entryTypeMeta);
  return {
    timesheet,
    entries,
    report,
    dailyBreakdown: buildDailyTimeBreakdown(
      entries,
      dateFrom,
      dateTo,
      entryTypeMeta.map((item) => ({
        id: item.id,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    ),
    balance: buildWorkPeriodBalance(report, dateFrom, dateTo, dailyHoursLimit),
  };
}
