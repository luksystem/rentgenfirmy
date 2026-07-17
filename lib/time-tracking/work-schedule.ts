import { getPolishHolidayName } from "@/lib/resource-plan/polish-holidays";
import { eachDateInRange } from "@/lib/time-tracking/timesheet-period";

export const DEFAULT_DAILY_WORK_MINUTES = 8 * 60;

export function resolveDailyWorkMinutes(dailyHoursLimit: number | null | undefined): number {
  if (dailyHoursLimit != null && dailyHoursLimit > 0) {
    return Math.round(dailyHoursLimit * 60);
  }
  return DEFAULT_DAILY_WORK_MINUTES;
}

export function isWorkingDay(date: string): boolean {
  const value = new Date(`${date}T12:00:00`);
  const dayOfWeek = value.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  return !getPolishHolidayName(value);
}

export function countWorkingDaysInRange(dateFrom: string, dateTo: string): number {
  return eachDateInRange(dateFrom, dateTo).filter(isWorkingDay).length;
}

export function listWorkingDaysInRange(dateFrom: string, dateTo: string): string[] {
  return eachDateInRange(dateFrom, dateTo).filter(isWorkingDay);
}

export function buildExpectedWorkMinutes(
  dateFrom: string,
  dateTo: string,
  dailyHoursLimit?: number | null,
): { expectedWorkMinutes: number; workingDays: number; dailyMinutesNorm: number } {
  const dailyMinutesNorm = resolveDailyWorkMinutes(dailyHoursLimit);
  const workingDays = countWorkingDaysInRange(dateFrom, dateTo);
  return {
    expectedWorkMinutes: workingDays * dailyMinutesNorm,
    workingDays,
    dailyMinutesNorm,
  };
}
