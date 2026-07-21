"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { ProjectHourBudgetSummary } from "@/lib/time-tracking/project-hour-budget";
import { cn } from "@/lib/utils";

export function ProjectHourBudgetCard({ budget }: { budget: ProjectHourBudgetSummary }) {
  return (
    <Card
      className={cn(
        "min-w-0 max-w-full overflow-hidden",
        budget.overBudget && "border-rose-500/40 bg-rose-500/5",
      )}
    >
      <CardContent className="grid min-w-0 gap-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {budget.usageOnly ? "Przepracowane godziny" : "Budżet godzin kontraktu"}
          </p>
          {budget.usageOnly ? (
            <>
              <p className="mt-1 break-words text-2xl font-semibold text-foreground">
                {formatDurationMinutes(budget.totalUsedMinutes)}
              </p>
              <p className="mt-1 break-words text-sm text-muted">
                Zarejestrowany czas pracy w projekcie (rozliczenie godzinowe)
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 break-words text-2xl font-semibold text-foreground">
                {formatDurationMinutes(budget.totalUsedMinutes)}{" "}
                <span className="text-base font-normal text-muted">
                  / {formatDurationMinutes(budget.totalBudgetMinutes)}
                </span>
              </p>
              <p
                className={cn(
                  "mt-1 break-words text-sm",
                  budget.overBudget ? "text-rose-300" : "text-muted",
                )}
              >
                {budget.overBudget
                  ? `Przekroczenie o ${formatDurationMinutes(budget.totalUsedMinutes - budget.totalBudgetMinutes)}`
                  : `Pozostało ${formatDurationMinutes(budget.totalRemainingMinutes)} (${100 - budget.utilizationPercent}%)`}
              </p>
            </>
          )}
        </div>

        {!budget.usageOnly ? (
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budget.overBudget ? "bg-rose-500" : "bg-accent",
              )}
              style={{ width: `${Math.min(budget.utilizationPercent, 100)}%` }}
            />
          </div>
        ) : null}

        {!budget.usageOnly && budget.lines.length > 1 ? (
          <div className="grid min-w-0 gap-2">
            {budget.lines.map((line) => (
              <div
                key={line.quotaId}
                className="flex min-w-0 flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 break-words text-muted">{line.label}</span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatDurationMinutes(line.usedMinutes)} / {formatDurationMinutes(line.budgetMinutes)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
