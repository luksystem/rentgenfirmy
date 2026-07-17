import { getPolishHolidayName } from "@/lib/resource-plan/polish-holidays";
import type { LeaveRequest, LeaveRequestStatus } from "@/lib/leave/types";

export type MatrixDateMeta = {
  date: string;
  isDayOff: boolean;
  isWeekend: boolean;
  holidayName: string | null;
};

export type MatrixLeaveCellMeta = {
  status: Extract<LeaveRequestStatus, "approved" | "pending">;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
};

export function buildMatrixDateMeta(date: string): MatrixDateMeta {
  const day = new Date(`${date}T12:00:00`);
  const holidayName = getPolishHolidayName(day);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return {
    date,
    isWeekend,
    holidayName,
    isDayOff: isWeekend || Boolean(holidayName),
  };
}

export function leaveOverlapsPeriod(
  leave: Pick<LeaveRequest, "startDate" | "endDate">,
  dateFrom: string,
  dateTo: string,
): boolean {
  return leave.startDate <= dateTo && leave.endDate >= dateFrom;
}

export function isDateWithinLeave(date: string, leave: Pick<LeaveRequest, "startDate" | "endDate">): boolean {
  return date >= leave.startDate && date <= leave.endDate;
}

export function resolveLeaveForUserOnDate(
  userId: string,
  date: string,
  leaves: LeaveRequest[],
  leaveTypeLabel: (leaveTypeItemId: string | null) => string,
): MatrixLeaveCellMeta | null {
  const matches = leaves.filter(
    (leave) =>
      leave.profileId === userId &&
      (leave.status === "approved" || leave.status === "pending") &&
      isDateWithinLeave(date, leave),
  );

  const approved = matches.find((leave) => leave.status === "approved");
  const pending = matches.find((leave) => leave.status === "pending");
  const item = approved ?? pending;
  if (!item) {
    return null;
  }

  const status: MatrixLeaveCellMeta["status"] =
    item.status === "approved" ? "approved" : "pending";

  return {
    status,
    leaveTypeName: leaveTypeLabel(item.leaveTypeItemId),
    startDate: item.startDate,
    endDate: item.endDate,
  };
}

export function buildLeaveCellIndex(
  userIds: string[],
  dates: string[],
  leaves: LeaveRequest[],
  leaveTypeLabel: (leaveTypeItemId: string | null) => string,
): Map<string, Map<string, MatrixLeaveCellMeta>> {
  const index = new Map<string, Map<string, MatrixLeaveCellMeta>>();

  for (const userId of userIds) {
    const byDate = new Map<string, MatrixLeaveCellMeta>();
    for (const date of dates) {
      const meta = resolveLeaveForUserOnDate(userId, date, leaves, leaveTypeLabel);
      if (meta) {
        byDate.set(date, meta);
      }
    }
    index.set(userId, byDate);
  }

  return index;
}

export function matrixDayHeaderClassName(meta: MatrixDateMeta): string {
  if (meta.holidayName) {
    return "bg-violet-500/20 text-violet-100";
  }
  if (meta.isWeekend) {
    return "bg-zinc-700/50 text-muted";
  }
  return "";
}

export function matrixDayOffCellClassName(meta: MatrixDateMeta): string {
  if (meta.holidayName) {
    return "bg-violet-500/15";
  }
  if (meta.isWeekend) {
    return "bg-zinc-800/70";
  }
  return "";
}

export function matrixEmployeeCellClassName(
  dayMeta: MatrixDateMeta,
  leaveMeta: MatrixLeaveCellMeta | null | undefined,
): string {
  if (leaveMeta?.status === "approved") {
    return "bg-emerald-500/30 ring-1 ring-inset ring-emerald-500/60";
  }
  if (leaveMeta?.status === "pending") {
    return "bg-amber-500/25 ring-1 ring-inset ring-dashed ring-amber-500/60";
  }
  return matrixDayOffCellClassName(dayMeta);
}

export function formatMatrixHeaderDayLabel(date: string, periodType: "week" | "month"): string {
  const value = new Date(`${date}T12:00:00`);
  if (periodType === "month") {
    const day = new Intl.DateTimeFormat("pl-PL", { day: "numeric" }).format(value);
    const weekday = new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(value).replace(/\.$/, "");
    return `${day}\n${weekday}`;
  }
  return formatMatrixDayHeader(date, periodType);
}

function formatMatrixDayHeader(date: string, periodType: "week" | "month"): string {
  const value = new Date(`${date}T12:00:00`);
  if (periodType === "month") {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric" }).format(value);
  }
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric" })
    .format(value)
    .replace(/\.$/, "");
}

export function matrixEmployeeCellTitle(
  dayMeta: MatrixDateMeta,
  leaveMeta: MatrixLeaveCellMeta | null | undefined,
): string | undefined {
  if (leaveMeta) {
    const statusLabel =
      leaveMeta.status === "approved"
        ? "Urlop zaakceptowany"
        : "Urlop — oczekuje na akceptację";
    return `${statusLabel}: ${leaveMeta.leaveTypeName}, ${leaveMeta.startDate} – ${leaveMeta.endDate}`;
  }
  if (dayMeta.holidayName) {
    return dayMeta.holidayName;
  }
  if (dayMeta.isWeekend) {
    return "Weekend";
  }
  return undefined;
}
