"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import {
  TIME_ENTRY_WORK_CAUSE_LABELS,
  type TimeEntryWorkCause,
} from "@/lib/time-tracking/types";
import type { WorkTypeBreakdownRow } from "@/lib/supabase/work-type-breakdown-repository";

/**
 * Faza 8 (/docs/role/05-spec-obciazenie.md §3.4) — udział czasu na poprawki i dokończenia wg
 * przyczyn. Świadomie miara PROCESU: agregacja per miesiąc (i opcjonalnie per projekt, gdy rows
 * pochodzą z jednego projektu), nigdy per osoba — nie dodawaj tu podziału po user_id/nazwisku.
 */
export function WorkTypeBreakdownCard({ rows }: { rows: WorkTypeBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted">
          Brak wpisów z określonym rodzajem pracy w tym okresie.
        </CardContent>
      </Card>
    );
  }

  const months = Array.from(new Set(rows.map((row) => row.month))).sort((a, b) =>
    a < b ? 1 : -1,
  );

  return (
    <div className="grid gap-3">
      {months.map((month) => {
        const monthRows = rows.filter((row) => row.month === month);
        const totalMinutes = monthRows.reduce((sum, row) => sum + row.totalMinutes, 0);
        const reworkMinutes = monthRows
          .filter((row) => row.workNature === "rework" || row.workNature === "unplanned_closing")
          .reduce((sum, row) => sum + row.totalMinutes, 0);
        const scopeChangeMinutes = monthRows
          .filter((row) => row.workNature === "scope_change")
          .reduce((sum, row) => sum + row.totalMinutes, 0);
        const reworkPercent = totalMinutes > 0 ? Math.round((reworkMinutes / totalMinutes) * 100) : 0;

        const causeTotals = new Map<TimeEntryWorkCause, number>();
        for (const row of monthRows) {
          if (!row.workCause) continue;
          causeTotals.set(row.workCause, (causeTotals.get(row.workCause) ?? 0) + row.totalMinutes);
        }

        const monthLabel = new Date(`${month}T00:00:00`).toLocaleDateString("pl-PL", {
          year: "numeric",
          month: "long",
        });

        return (
          <Card key={month} className="min-w-0 max-w-full overflow-hidden">
            <CardContent className="grid gap-3 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize text-foreground">{monthLabel}</p>
                <p className="text-sm text-muted">
                  Poprawki i dokończenia:{" "}
                  <span className="font-semibold text-foreground">{reworkPercent}%</span>{" "}
                  ({formatDurationMinutes(reworkMinutes)} z {formatDurationMinutes(totalMinutes)})
                </p>
              </div>

              {causeTotals.size > 0 ? (
                <ul className="grid gap-1.5">
                  {Array.from(causeTotals.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([cause, minutes]) => (
                      <li
                        key={cause}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-1.5 text-sm"
                      >
                        <span className="text-foreground">{TIME_ENTRY_WORK_CAUSE_LABELS[cause]}</span>
                        <span className="shrink-0 text-muted">{formatDurationMinutes(minutes)}</span>
                      </li>
                    ))}
                </ul>
              ) : null}

              {scopeChangeMinutes > 0 ? (
                <p className="text-xs text-muted">
                  Zmiana zakresu (na zlecenie inwestora, poza miarą procesu):{" "}
                  {formatDurationMinutes(scopeChangeMinutes)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
