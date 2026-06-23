"use client";

import type { ProjectSatisfactionBundle } from "@/lib/dashboard/satisfaction-types";
import { computeSatisfactionSummary } from "@/lib/dashboard/satisfaction-types";
import { StarRatingDisplay } from "@/components/dashboard/star-rating-input";
import { cn } from "@/lib/utils";

export function ProjectSatisfactionSummaryCard({
  bundle,
  compact = false,
  className,
}: {
  bundle: ProjectSatisfactionBundle;
  compact?: boolean;
  className?: string;
}) {
  const summary = computeSatisfactionSummary(bundle);

  if (
    summary.stageCount === 0 &&
    summary.fulfillmentTotal === 0 &&
    summary.expectationScore == null &&
    summary.realityScore == null
  ) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/80 bg-surface-muted/20 p-4 text-sm text-muted",
          className,
        )}
      >
        Brak ocen — pojawią się po zakończeniu etapów procesu i weryfikacji ustaleń.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/8 via-surface to-surface p-4",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
        Poziom zadowolenia
      </p>

      <div className={cn("mt-3 grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
        {summary.avgStageScore != null ? (
          <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-xs text-muted">Średnia z etapów</p>
            <div className="mt-1">
              <StarRatingDisplay value={Math.round(summary.avgStageScore)} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{summary.stageCount} etap(ów) ocenionych</p>
          </div>
        ) : null}

        {summary.fulfillmentPercent != null ? (
          <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-xs text-muted">Spełnienie oczekiwań</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{summary.fulfillmentPercent}%</p>
            <p className="mt-1 text-[11px] text-muted">
              {summary.fulfillmentMet}/{summary.fulfillmentTotal} pozycji
            </p>
          </div>
        ) : null}

        {summary.expectationScore != null ? (
          <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-xs text-muted">Oczekiwania (przed)</p>
            <div className="mt-1">
              <StarRatingDisplay value={summary.expectationScore} />
            </div>
          </div>
        ) : null}

        {summary.realityScore != null ? (
          <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
            <p className="text-xs text-muted">Rzeczywistość (po)</p>
            <div className="mt-1">
              <StarRatingDisplay value={summary.realityScore} />
            </div>
            {summary.expectationGap != null ? (
              <p
                className={cn(
                  "mt-1 text-[11px] font-medium",
                  summary.expectationGap >= 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {summary.expectationGap >= 0 ? "+" : ""}
                {summary.expectationGap} vs oczekiwania
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
