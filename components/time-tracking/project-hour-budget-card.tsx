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
              <p className="mt-1 text-xs text-muted">
                Zużycie według kategorii czasu przypisanych do pól kontraktu.
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

        {!budget.usageOnly && budget.lines.length > 0 ? (
          <div className="grid min-w-0 gap-2">
            {budget.lines.map((line) => (
              <div
                key={line.quotaId}
                className="flex min-w-0 flex-col gap-0.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <span className="break-words text-muted">{line.label}</span>
                  {line.categoryName ? (
                    <p className="text-xs text-muted/80">Kategoria: {line.categoryName}</p>
                  ) : (
                    <p className="text-xs text-amber-600/90 dark:text-amber-300/80">
                      Brak kategorii — przypisz w budżecie projektu
                    </p>
                  )}
                  {line.notes ? (
                    <p className="text-xs text-muted/80">{line.notes}</p>
                  ) : null}
                </div>
                <span className="shrink-0 font-medium text-foreground">
                  {formatDurationMinutes(line.usedMinutes)} / {formatDurationMinutes(line.budgetMinutes)}
                </span>
              </div>
            ))}
            {budget.unmatchedUsedMinutes > 0 ? (
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border/50 pt-2 text-sm">
                <span className="text-muted">Pozostałe (inne kategorie / bez kategorii)</span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatDurationMinutes(budget.unmatchedUsedMinutes)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
