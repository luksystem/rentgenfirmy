"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationHm } from "@/lib/time-tracking/format";
import type { TeamPeriodEmployeeRow } from "@/lib/time-tracking/team-period-detail";
import { TIMESHEET_STATUS_LABELS, type TimesheetStatus } from "@/lib/time-tracking/types";
import { cn } from "@/lib/utils";

export type PeriodEmployeeSummaryRow = {
  userId: string;
  userDisplayName: string;
  status?: TimesheetStatus;
  workMinutes: number;
  absenceMinutes: number;
  billableMinutes: number;
  totalMinutes: number;
  entryCount: number;
};

function statusTone(status: TimesheetStatus | undefined) {
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

function mapTeamEmployee(row: TeamPeriodEmployeeRow): PeriodEmployeeSummaryRow {
  return {
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    status: row.status,
    workMinutes: row.workMinutes,
    absenceMinutes: row.absenceMinutes,
    billableMinutes: row.billableMinutes,
    totalMinutes: row.totalMinutes,
    entryCount: row.entryCount,
  };
}

function sumRows(rows: PeriodEmployeeSummaryRow[]) {
  return rows.reduce(
    (acc, row) => ({
      workMinutes: acc.workMinutes + row.workMinutes,
      absenceMinutes: acc.absenceMinutes + row.absenceMinutes,
      billableMinutes: acc.billableMinutes + row.billableMinutes,
      totalMinutes: acc.totalMinutes + row.totalMinutes,
      entryCount: acc.entryCount + row.entryCount,
    }),
    { workMinutes: 0, absenceMinutes: 0, billableMinutes: 0, totalMinutes: 0, entryCount: 0 },
  );
}

export function TimePeriodEmployeeSummaryTable({
  rows,
  periodLabel,
  selectedUserId,
  onSelectEmployee,
  showStatus = true,
}: {
  rows: PeriodEmployeeSummaryRow[] | TeamPeriodEmployeeRow[];
  periodLabel?: string;
  selectedUserId?: string;
  onSelectEmployee?: (userId: string) => void;
  showStatus?: boolean;
}) {
  const normalized = rows.map((row) =>
    "dailyBreakdown" in row ? mapTeamEmployee(row) : row,
  );
  const hasData = normalized.some((row) => row.entryCount > 0);
  const totals = sumRows(normalized);
  const selectable = Boolean(onSelectEmployee);

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Podsumowanie okresu</p>
          <p className="text-xs text-muted">
            {periodLabel
              ? `Zestawienie zbiorcze za ${periodLabel} — praca, nieobecności i wpisy per pracownik.`
              : "Zestawienie zbiorcze za wybrany okres — praca, nieobecności i wpisy per pracownik."}
          </p>
        </div>

        {!hasData ? (
          <p className="text-sm text-muted">Brak wpisów w wybranym okresie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Pracownik</th>
                  {showStatus ? <th className="px-2 py-2 font-medium">Arkusz</th> : null}
                  <th className="px-2 py-2 font-medium">Praca</th>
                  <th className="px-2 py-2 font-medium">Nieobecności</th>
                  <th className="px-2 py-2 font-medium">Do rozliczenia</th>
                  <th className="px-2 py-2 font-medium">Razem</th>
                  <th className="px-2 py-2 font-medium">Wpisy</th>
                </tr>
              </thead>
              <tbody>
                {normalized.map((row) => (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-b border-border/40 last:border-b-0",
                      selectable && "cursor-pointer transition hover:bg-surface-muted/60",
                      selectedUserId === row.userId && "bg-accent/10",
                    )}
                    onClick={selectable ? () => onSelectEmployee?.(row.userId) : undefined}
                  >
                    <td className="px-2 py-2.5 font-medium text-foreground">{row.userDisplayName}</td>
                    {showStatus ? (
                      <td className="px-2 py-2.5">
                        {row.status ? (
                          <Badge tone={statusTone(row.status)}>
                            {TIMESHEET_STATUS_LABELS[row.status]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(row.workMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(row.absenceMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(row.billableMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums font-medium text-foreground">
                      {formatDurationHm(row.totalMinutes)}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{row.entryCount}</td>
                  </tr>
                ))}
                {normalized.length > 1 ? (
                  <tr className="border-t border-border/70 bg-surface-muted/40 font-medium">
                    <td className="px-2 py-2.5 text-foreground">Razem zespół</td>
                    {showStatus ? <td className="px-2 py-2.5" /> : null}
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(totals.workMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(totals.absenceMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(totals.billableMinutes)}
                    </td>
                    <td className="px-2 py-2.5 tabular-nums text-foreground">
                      {formatDurationHm(totals.totalMinutes)}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{totals.entryCount}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
