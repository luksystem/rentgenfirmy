"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import {
  buildLeaveCellIndex,
  buildMatrixDateMeta,
  formatMatrixHeaderDayLabel,
  leaveOverlapsPeriod,
  matrixDayHeaderClassName,
  matrixDayOffCellClassName,
  matrixEmployeeCellClassName,
  matrixEmployeeCellTitle,
  type MatrixDateMeta,
  type MatrixLeaveCellMeta,
} from "@/lib/time-tracking/calendar-day-markers";
import {
  type TeamPeriodDetail,
  type TeamPeriodEmployeeRow,
  type TeamPeriodProjectRow,
} from "@/lib/time-tracking/team-period-detail";
import { TIMESHEET_STATUS_LABELS, type TimesheetPeriodType } from "@/lib/time-tracking/types";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useLeaveStore } from "@/store/leave-store";
import { cn } from "@/lib/utils";

function formatMatrixMinutes(minutes: number): string {
  if (minutes <= 0) {
    return "—";
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} h`;
  }
  return formatDurationMinutes(minutes);
}

function formatMatrixCellContent(
  minutes: number,
  leaveMeta: MatrixLeaveCellMeta | null | undefined,
): string {
  if (minutes > 0) {
    return formatMatrixMinutes(minutes);
  }
  if (leaveMeta?.status === "approved") {
    return "Urlop";
  }
  if (leaveMeta?.status === "pending") {
    return "Oczek.";
  }
  return "—";
}

function statusTone(status: TeamPeriodEmployeeRow["status"]) {
  switch (status) {
    case "approved":
      return "active" as const;
    case "submitted":
      return "waiting" as const;
    case "rejected":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-6 rounded bg-zinc-700/50" aria-hidden />
        Weekend
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-6 rounded bg-violet-500/20" aria-hidden />
        Święto
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-6 rounded bg-emerald-500/30 ring-1 ring-inset ring-emerald-500/60" aria-hidden />
        Urlop zaakceptowany
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3 w-6 rounded bg-amber-500/25 ring-1 ring-inset ring-dashed ring-amber-500/60"
          aria-hidden
        />
        Urlop oczekujący
      </span>
    </div>
  );
}

function MatrixHeader({
  datesMeta,
  periodType,
}: {
  datesMeta: MatrixDateMeta[];
  periodType: TimesheetPeriodType;
}) {
  return (
    <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted">
      <th className="sticky left-0 z-20 min-w-[180px] bg-surface px-2 py-2 font-medium">Pracownik</th>
      {datesMeta.map((meta) => (
        <th
          key={meta.date}
          className={cn(
            "min-w-[52px] whitespace-pre-line px-1 py-2 text-center text-[11px] font-medium leading-tight",
            matrixDayHeaderClassName(meta),
          )}
          title={meta.holidayName ?? (meta.isWeekend ? "Weekend" : undefined)}
        >
          {formatMatrixHeaderDayLabel(meta.date, periodType)}
        </th>
      ))}
      <th className="min-w-[72px] px-2 py-2 text-right font-medium">Razem</th>
    </tr>
  );
}

function MatrixMinutesRow({
  label,
  datesMeta,
  minutesByDate,
  totalMinutes,
  className,
  indent = false,
  leaveByDate,
}: {
  label: React.ReactNode;
  datesMeta: MatrixDateMeta[];
  minutesByDate: Record<string, number>;
  totalMinutes: number;
  className?: string;
  indent?: boolean;
  leaveByDate?: Map<string, MatrixLeaveCellMeta>;
}) {
  return (
    <tr className={className}>
      <td
        className={cn(
          "sticky left-0 z-10 bg-inherit px-2 py-2 text-sm text-foreground",
          indent && "pl-8",
        )}
      >
        {label}
      </td>
      {datesMeta.map((meta) => (
        <td
          key={meta.date}
          className={cn(
            "px-1 py-2 text-center text-xs text-foreground",
            leaveByDate
              ? matrixEmployeeCellClassName(meta, leaveByDate.get(meta.date))
              : matrixDayOffCellClassName(meta),
          )}
          title={
            leaveByDate
              ? matrixEmployeeCellTitle(meta, leaveByDate.get(meta.date))
              : meta.holidayName ?? (meta.isWeekend ? "Weekend" : undefined)
          }
        >
          {formatMatrixCellContent(minutesByDate[meta.date] ?? 0, leaveByDate?.get(meta.date))}
        </td>
      ))}
      <td className="px-2 py-2 text-right text-sm font-medium text-foreground">
        {formatMatrixMinutes(totalMinutes)}
      </td>
    </tr>
  );
}

function ProjectEntriesDetail({ project }: { project: TeamPeriodProjectRow }) {
  if (project.entries.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border/40 bg-surface-muted/30 px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Wpisy — {project.projectLabel}</p>
      <div className="grid gap-2">
        {project.entries.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-col gap-1 rounded-lg border border-border/50 bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.categoryColor }}
                  aria-hidden
                />
                <span className="font-medium text-foreground">{entry.categoryName}</span>
                <span className="text-muted">{entry.entryTypeName}</span>
                <span className="text-xs text-muted">{entry.date}</span>
              </div>
              {entry.description ? <p className="mt-1 text-muted">{entry.description}</p> : null}
              {entry.workItemTitle ? (
                <p className="mt-1 text-xs text-muted">Zadanie: {entry.workItemTitle}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-medium text-foreground">
              {formatDurationMinutes(entry.durationMinutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeProjectsSection({
  employee,
  datesMeta,
  leaveByDate,
}: {
  employee: TeamPeriodEmployeeRow;
  datesMeta: MatrixDateMeta[];
  leaveByDate: Map<string, MatrixLeaveCellMeta>;
}) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  if (employee.projects.length === 0) {
    return (
      <tr>
        <td colSpan={datesMeta.length + 2} className="bg-surface-muted/20 px-4 py-3 text-sm text-muted">
          Brak wpisów przypisanych do projektów w tym okresie.
        </td>
      </tr>
    );
  }

  return (
    <>
      {employee.projects.map((project) => {
        const projectKey = `${employee.userId}:${project.projectId ?? "none"}:${project.projectLabel}`;
        const expanded = expandedProjects[projectKey] ?? false;

        return (
          <Fragment key={projectKey}>
            <MatrixMinutesRow
              label={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-left"
                  onClick={() =>
                    setExpandedProjects((state) => ({
                      ...state,
                      [projectKey]: !expanded,
                    }))
                  }
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="truncate">{project.projectLabel}</span>
                </button>
              }
              datesMeta={datesMeta}
              minutesByDate={project.minutesByDate}
              totalMinutes={project.totalMinutes}
              leaveByDate={leaveByDate}
              indent
              className="border-b border-border/30 bg-surface-muted/20"
            />
            {expanded ? (
              <tr className="bg-surface-muted/20">
                <td colSpan={datesMeta.length + 2} className="p-0">
                  <ProjectEntriesDetail project={project} />
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function TimeTeamPeriodMatrix({
  detail,
  loading,
  selectedUserId,
  onSelectEmployee,
}: {
  detail: TeamPeriodDetail | null;
  loading: boolean;
  selectedUserId?: string;
  onSelectEmployee: (userId: string) => void;
}) {
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
  const ensurePlanningLeaveRequests = useLeaveStore((state) => state.ensurePlanningRequests);
  const planningLeaveRequests = useLeaveStore((state) => state.planningRequests);
  const leaveTypeLabel = useDictionaryStore((state) => state.itemLabel);

  useEffect(() => {
    void ensurePlanningLeaveRequests();
  }, [ensurePlanningLeaveRequests]);

  const totalsByDate = detail?.totalsByDate ?? {};
  const periodType = detail?.periodType ?? "week";

  const dates = useMemo(() => detail?.dates ?? [], [detail?.dates]);
  const datesMeta = useMemo(() => dates.map(buildMatrixDateMeta), [dates]);

  const visibleEmployees = useMemo(() => detail?.employees ?? [], [detail]);

  const periodLeaves = useMemo(() => {
    if (!detail) {
      return [];
    }
    return planningLeaveRequests.filter(
      (leave) =>
        (leave.status === "approved" || leave.status === "pending") &&
        leaveOverlapsPeriod(leave, detail.dateFrom, detail.dateTo),
    );
  }, [planningLeaveRequests, detail]);

  const leaveByUser = useMemo(
    () =>
      buildLeaveCellIndex(
        visibleEmployees.map((employee) => employee.userId),
        dates,
        periodLeaves,
        leaveTypeLabel,
      ),
    [visibleEmployees, dates, periodLeaves, leaveTypeLabel],
  );

  if (loading && !detail) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">Wczytywanie zestawienia zespołu…</CardContent>
      </Card>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Zestawienie dzienne zespołu</p>
          <p className="text-xs text-muted">
            Godziny dzień po dniu per pracownik. Rozwiń wiersz, aby zobaczyć rozbicie na projekty i szczegóły wpisów.
          </p>
        </div>

        <MatrixLegend />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <MatrixHeader datesMeta={datesMeta} periodType={periodType} />
            </thead>
            <tbody>
              {visibleEmployees.map((employee) => {
                const expanded = expandedEmployees[employee.userId] ?? false;
                const selected = selectedUserId === employee.userId;
                const leaveByDate = leaveByUser.get(employee.userId) ?? new Map();

                return (
                  <Fragment key={employee.userId}>
                    <tr
                      className={cn(
                        "border-b border-border/40 bg-surface transition hover:bg-surface-muted/40",
                        selected && "bg-accent/10",
                      )}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-2 py-2">
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 text-left"
                          onClick={() => {
                            onSelectEmployee(employee.userId);
                            setExpandedEmployees((state) => ({
                              ...state,
                              [employee.userId]: !expanded,
                            }));
                          }}
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                          )}
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">{employee.userDisplayName}</span>
                            <span className="mt-1 inline-flex">
                              <Badge tone={statusTone(employee.status)}>
                                {TIMESHEET_STATUS_LABELS[employee.status]}
                              </Badge>
                            </span>
                          </span>
                        </button>
                      </td>
                      {datesMeta.map((meta) => (
                        <td
                          key={meta.date}
                          className={cn(
                            "px-1 py-2 text-center text-xs text-foreground",
                            matrixEmployeeCellClassName(meta, leaveByDate.get(meta.date)),
                          )}
                          title={matrixEmployeeCellTitle(meta, leaveByDate.get(meta.date))}
                        >
                          {formatMatrixCellContent(
                            employee.minutesByDate[meta.date] ?? 0,
                            leaveByDate.get(meta.date),
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right font-medium text-foreground">
                        {formatMatrixMinutes(employee.totalMinutes)}
                      </td>
                    </tr>
                    {expanded ? (
                      <EmployeeProjectsSection
                        employee={employee}
                        datesMeta={datesMeta}
                        leaveByDate={leaveByDate}
                      />
                    ) : null}
                  </Fragment>
                );
              })}

              {visibleEmployees.length > 1 ? (
                <MatrixMinutesRow
                  label={<span className="font-semibold text-foreground">Razem zespół</span>}
                  datesMeta={datesMeta}
                  minutesByDate={totalsByDate}
                  totalMinutes={detail.totalMinutes}
                  className="border-t border-border/70 bg-surface-muted/50 font-medium"
                />
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
