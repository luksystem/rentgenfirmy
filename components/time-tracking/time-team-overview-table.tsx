"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import { TIMESHEET_STATUS_LABELS, type TeamTimesheetOverviewRow } from "@/lib/time-tracking/types";
import { cn } from "@/lib/utils";

function statusTone(status: TeamTimesheetOverviewRow["status"]) {
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

export function TimeTeamOverviewTable({
  rows,
  selectedUserId,
  loading,
  onSelect,
}: {
  rows: TeamTimesheetOverviewRow[];
  selectedUserId?: string;
  loading: boolean;
  onSelect: (userId: string) => void;
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      workMinutes: acc.workMinutes + row.workMinutes,
      totalMinutes: acc.totalMinutes + row.totalMinutes,
      entryCount: acc.entryCount + row.entryCount,
    }),
    { workMinutes: 0, totalMinutes: 0, entryCount: 0 },
  );

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Zespół w okresie</p>
          <p className="text-xs text-muted">
            Kliknij wiersz, aby zobaczyć szczegółowe zestawienie pracownika.
          </p>
        </div>

        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted">Wczytywanie zestawienia zespołu…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">Brak aktywnych profili zespołu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Pracownik</th>
                  <th className="px-2 py-2 font-medium">Status arkusza</th>
                  <th className="px-2 py-2 font-medium">Praca</th>
                  <th className="px-2 py-2 font-medium">Razem</th>
                  <th className="px-2 py-2 font-medium">Wpisy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.userId}
                    className={cn(
                      "cursor-pointer border-b border-border/40 transition hover:bg-surface-muted/60",
                      selectedUserId === row.userId && "bg-accent/10",
                    )}
                    onClick={() => onSelect(row.userId)}
                  >
                    <td className="px-2 py-2.5 font-medium text-foreground">{row.userDisplayName}</td>
                    <td className="px-2 py-2.5">
                      <Badge tone={statusTone(row.status)}>
                        {TIMESHEET_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-foreground">{formatDurationMinutes(row.workMinutes)}</td>
                    <td className="px-2 py-2.5 text-foreground">{formatDurationMinutes(row.totalMinutes)}</td>
                    <td className="px-2 py-2.5 text-muted">{row.entryCount}</td>
                  </tr>
                ))}
                {rows.length > 1 ? (
                  <tr className="border-t border-border/70 bg-surface-muted/40 font-medium">
                    <td className="px-2 py-2.5 text-foreground">Razem zespół</td>
                    <td className="px-2 py-2.5" />
                    <td className="px-2 py-2.5 text-foreground">
                      {formatDurationMinutes(totals.workMinutes)}
                    </td>
                    <td className="px-2 py-2.5 text-foreground">
                      {formatDurationMinutes(totals.totalMinutes)}
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
