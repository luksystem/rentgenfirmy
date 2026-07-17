import { buildExpectedWorkMinutes } from "@/lib/time-tracking/work-schedule";
import type { PeriodTimeReport } from "@/lib/time-tracking/timesheet-summary";

export type WorkPeriodBalance = {
  expectedWorkMinutes: number;
  workingDays: number;
  dailyMinutesNorm: number;
  actualWorkMinutes: number;
  absenceMinutes: number;
  overtimeEntryMinutes: number;
  overtimeBalanceMinutes: number;
  balanceMinutes: number;
  totalMinutes: number;
};

export function buildWorkPeriodBalance(
  report: Pick<
    PeriodTimeReport,
    "workMinutes" | "absenceMinutes" | "totalMinutes" | "byType"
  >,
  dateFrom: string,
  dateTo: string,
  dailyHoursLimit?: number | null,
): WorkPeriodBalance {
  const { expectedWorkMinutes, workingDays, dailyMinutesNorm } = buildExpectedWorkMinutes(
    dateFrom,
    dateTo,
    dailyHoursLimit,
  );

  const overtimeEntryMinutes = report.byType
    .filter((item) => item.entryTypeName.toLowerCase().includes("nadgodzin"))
    .reduce((sum, item) => sum + item.totalMinutes, 0);

  const actualWorkMinutes = report.workMinutes;
  const overtimeBalanceMinutes = Math.max(0, actualWorkMinutes - expectedWorkMinutes);
  const balanceMinutes = actualWorkMinutes - expectedWorkMinutes;

  return {
    expectedWorkMinutes,
    workingDays,
    dailyMinutesNorm,
    actualWorkMinutes,
    absenceMinutes: report.absenceMinutes,
    overtimeEntryMinutes,
    overtimeBalanceMinutes,
    balanceMinutes,
    totalMinutes: report.totalMinutes,
  };
}
