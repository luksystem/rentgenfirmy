"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MonthlyReviewTeamQueueRow } from "@/lib/monthly-reviews/types";

export function TeamReviewQueue({
  rows,
  onRate,
}: {
  rows: MonthlyReviewTeamQueueRow[];
  onRate: (row: MonthlyReviewTeamQueueRow) => void;
}) {
  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted">
          Brak pracowników uczestniczących w cyklu ocen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <Card key={row.employeeId}>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{row.employeeName}</p>
                <Badge tone={row.selfSubmittedAt ? "active" : "waiting"}>
                  {row.selfSubmittedAt ? "Samoocena złożona" : "Czeka na samoocenę"}
                </Badge>
                <Badge tone={row.managerSubmittedAt ? "active" : "waiting"}>
                  {row.managerSubmittedAt ? "Oceniono" : "Do oceny"}
                </Badge>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {row.managerSubmittedAt ? (
                <span className="text-xs text-muted">Ocena złożona</span>
              ) : (
                <Button type="button" size="sm" onClick={() => onRate(row)}>
                  Oceń
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
