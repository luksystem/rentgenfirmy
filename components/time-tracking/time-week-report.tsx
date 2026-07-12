"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buildWeekTimeReport, formatReportLine } from "@/lib/time-tracking/reports";
import type { TimeEntryView } from "@/lib/time-tracking/types";
import { useTimeTrackingStore } from "@/store/time-tracking-store";

export function TimeWeekReport({ entries }: { entries: TimeEntryView[] }) {
  const meta = useTimeTrackingStore((state) => state.meta);

  const report = useMemo(() => {
    if (!meta) {
      return null;
    }
    return buildWeekTimeReport(
      entries,
      meta.entryTypes.map((item) => ({
        id: item.id,
        name: item.name,
        countsAsWork: item.countsAsWork,
        countsAsAbsence: item.countsAsAbsence,
      })),
    );
  }, [entries, meta]);

  if (!report || report.entryCount === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="grid gap-4 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Raport tygodnia</p>
          <p className="text-xs text-muted">Podsumowanie wg kategorii i typów wpisów.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Praca</p>
            <p className="font-semibold text-foreground">{formatReportLine(report.workMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Nieobecności</p>
            <p className="font-semibold text-foreground">{formatReportLine(report.absenceMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Do rozliczenia</p>
            <p className="font-semibold text-foreground">{formatReportLine(report.billableMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Razem</p>
            <p className="font-semibold text-foreground">{formatReportLine(report.totalMinutes)}</p>
          </div>
        </div>

        {report.byCategory.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Kategorie</p>
            <div className="grid gap-2">
              {report.byCategory.map((item) => (
                <div key={item.categoryId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.categoryColor }}
                      aria-hidden
                    />
                    <span className="truncate text-foreground">{item.categoryName}</span>
                  </div>
                  <span className="shrink-0 text-muted">{formatReportLine(item.totalMinutes)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
