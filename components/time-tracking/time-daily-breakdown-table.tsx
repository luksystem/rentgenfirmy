"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { DailyTimeSummary } from "@/lib/time-tracking/timesheet-summary";

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export function TimeDailyBreakdownTable({ rows }: { rows: DailyTimeSummary[] }) {
  const hasEntries = rows.some((row) => row.entryCount > 0);

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Zestawienie dzienne</p>
          <p className="text-xs text-muted">Godziny pracy, nieobecności i wpisy w poszczególnych dniach okresu.</p>
        </div>

        {!hasEntries ? (
          <p className="text-sm text-muted">Brak wpisów w wybranym okresie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Dzień</th>
                  <th className="px-2 py-2 font-medium">Praca</th>
                  <th className="px-2 py-2 font-medium">Nieobecności</th>
                  <th className="px-2 py-2 font-medium">Do rozliczenia</th>
                  <th className="px-2 py-2 font-medium">Razem</th>
                  <th className="px-2 py-2 font-medium">Wpisy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <td className="px-2 py-2.5 font-medium text-foreground">{formatDayLabel(row.date)}</td>
                    <td className="px-2 py-2.5 text-foreground">{formatDurationMinutes(row.workMinutes)}</td>
                    <td className="px-2 py-2.5 text-foreground">
                      {formatDurationMinutes(row.absenceMinutes)}
                    </td>
                    <td className="px-2 py-2.5 text-foreground">
                      {formatDurationMinutes(row.billableMinutes)}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-foreground">
                      {formatDurationMinutes(row.totalMinutes)}
                    </td>
                    <td className="px-2 py-2.5 text-muted">{row.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
