import {
  buildDailyTimeBreakdown,
  type DailyTimeSummary,
} from "@/lib/time-tracking/timesheet-summary";
import { eachDateInRange } from "@/lib/time-tracking/timesheet-period";
import type { TimeEntryView, TimesheetPeriodType, TimesheetStatus } from "@/lib/time-tracking/types";

export type TeamPeriodEntryDetail = {
  id: string;
  date: string;
  durationMinutes: number;
  categoryName: string;
  categoryColor: string;
  entryTypeName: string;
  description: string;
  billable: boolean;
  workItemTitle: string | null;
};

export type TeamPeriodProjectRow = {
  projectId: string | null;
  projectLabel: string;
  totalMinutes: number;
  workMinutes: number;
  minutesByDate: Record<string, number>;
  entries: TeamPeriodEntryDetail[];
};

export type TeamPeriodEmployeeRow = {
  userId: string;
  userDisplayName: string;
  timesheetId: string | null;
  status: TimesheetStatus;
  totalMinutes: number;
  workMinutes: number;
  absenceMinutes: number;
  billableMinutes: number;
  entryCount: number;
  minutesByDate: Record<string, number>;
  dailyBreakdown: DailyTimeSummary[];
  projects: TeamPeriodProjectRow[];
};

export type TeamPeriodDetail = {
  dateFrom: string;
  dateTo: string;
  periodType: TimesheetPeriodType;
  dates: string[];
  employees: TeamPeriodEmployeeRow[];
  totalsByDate: Record<string, number>;
  totalMinutes: number;
};

type EntryTypeMeta = {
  id: string;
  countsAsWork: boolean;
  countsAsAbsence: boolean;
};

function mapEntryDetail(entry: TimeEntryView): TeamPeriodEntryDetail {
  return {
    id: entry.id,
    date: entry.date,
    durationMinutes: entry.durationMinutes,
    categoryName: entry.categoryName,
    categoryColor: entry.categoryColor,
    entryTypeName: entry.entryTypeName,
    description: entry.description,
    billable: entry.billable,
    workItemTitle: entry.workItemTitle,
  };
}

function projectLabel(entry: TimeEntryView): string {
  if (entry.projectName) {
    return entry.projectName;
  }
  if (entry.serviceId) {
    return "Serwis";
  }
  return "Bez projektu";
}

function projectKey(entry: TimeEntryView): string {
  if (entry.projectId) {
    return `project:${entry.projectId}`;
  }
  if (entry.serviceId) {
    return `service:${entry.serviceId}`;
  }
  return "none";
}

export function buildProjectBreakdownForEntries(
  entries: TimeEntryView[],
  dateFrom: string,
  dateTo: string,
  entryTypeMeta: EntryTypeMeta[],
): TeamPeriodProjectRow[] {
  const typeMeta = new Map(entryTypeMeta.map((item) => [item.id, item]));
  const dates = eachDateInRange(dateFrom, dateTo);
  const byProject = new Map<
    string,
    {
      projectId: string | null;
      projectLabel: string;
      minutesByDate: Record<string, number>;
      totalMinutes: number;
      workMinutes: number;
      entries: TeamPeriodEntryDetail[];
    }
  >();

  for (const entry of entries) {
    const key = projectKey(entry);
    const label = projectLabel(entry);
    const row =
      byProject.get(key) ??
      ({
        projectId: entry.projectId,
        projectLabel: label,
        minutesByDate: Object.fromEntries(dates.map((date) => [date, 0])),
        totalMinutes: 0,
        workMinutes: 0,
        entries: [],
      } satisfies TeamPeriodProjectRow);

    row.totalMinutes += entry.durationMinutes;
    row.minutesByDate[entry.date] = (row.minutesByDate[entry.date] ?? 0) + entry.durationMinutes;

    const type = typeMeta.get(entry.entryTypeId);
    if (!type?.countsAsAbsence && (type?.countsAsWork ?? true)) {
      row.workMinutes += entry.durationMinutes;
    }

    row.entries.push(mapEntryDetail(entry));
    byProject.set(key, row);
  }

  return [...byProject.values()]
    .map((row) => ({
      projectId: row.projectId,
      projectLabel: row.projectLabel,
      totalMinutes: row.totalMinutes,
      workMinutes: row.workMinutes,
      minutesByDate: row.minutesByDate,
      entries: row.entries.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return b.durationMinutes - a.durationMinutes;
      }),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function buildEmployeePeriodDetail(input: {
  userId: string;
  userDisplayName: string;
  entries: TimeEntryView[];
  dateFrom: string;
  dateTo: string;
  entryTypeMeta: EntryTypeMeta[];
  timesheetId?: string | null;
  status?: TimesheetStatus;
}): TeamPeriodEmployeeRow {
  const dates = eachDateInRange(input.dateFrom, input.dateTo);
  const dailyBreakdown = buildDailyTimeBreakdown(
    input.entries,
    input.dateFrom,
    input.dateTo,
    input.entryTypeMeta,
  );
  const minutesByDate = Object.fromEntries(
    dates.map((date) => [date, dailyBreakdown.find((day) => day.date === date)?.totalMinutes ?? 0]),
  );

  let workMinutes = 0;
  let absenceMinutes = 0;
  let billableMinutes = 0;
  let totalMinutes = 0;
  for (const day of dailyBreakdown) {
    workMinutes += day.workMinutes;
    absenceMinutes += day.absenceMinutes;
    billableMinutes += day.billableMinutes;
    totalMinutes += day.totalMinutes;
  }

  return {
    userId: input.userId,
    userDisplayName: input.userDisplayName,
    timesheetId: input.timesheetId ?? null,
    status: input.status ?? "draft",
    totalMinutes,
    workMinutes,
    absenceMinutes,
    billableMinutes,
    entryCount: input.entries.length,
    minutesByDate,
    dailyBreakdown,
    projects: buildProjectBreakdownForEntries(
      input.entries,
      input.dateFrom,
      input.dateTo,
      input.entryTypeMeta,
    ),
  };
}

export function buildTeamPeriodDetail(input: {
  dateFrom: string;
  dateTo: string;
  periodType: TimesheetPeriodType;
  employees: Array<{
    userId: string;
    userDisplayName: string;
    entries: TimeEntryView[];
    timesheetId?: string | null;
    status?: TimesheetStatus;
  }>;
  entryTypeMeta: EntryTypeMeta[];
}): TeamPeriodDetail {
  const dates = eachDateInRange(input.dateFrom, input.dateTo);
  const employees = input.employees
    .map((employee) =>
      buildEmployeePeriodDetail({
        userId: employee.userId,
        userDisplayName: employee.userDisplayName,
        entries: employee.entries,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        entryTypeMeta: input.entryTypeMeta,
        timesheetId: employee.timesheetId,
        status: employee.status,
      }),
    )
    .sort((a, b) => a.userDisplayName.localeCompare(b.userDisplayName, "pl"));

  const totalsByDate = Object.fromEntries(
    dates.map((date) => [
      date,
      employees.reduce((sum, employee) => sum + (employee.minutesByDate[date] ?? 0), 0),
    ]),
  );

  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    periodType: input.periodType,
    dates,
    employees,
    totalsByDate,
    totalMinutes: employees.reduce((sum, employee) => sum + employee.totalMinutes, 0),
  };
}

export function formatMatrixDayHeader(date: string, periodType: TimesheetPeriodType): string {
  const value = new Date(`${date}T12:00:00`);
  if (periodType === "month") {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric" }).format(value);
  }
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric" }).format(value);
}
