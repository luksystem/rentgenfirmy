"use client";

import type { ReactNode } from "react";
import type { ProjectSatisfactionBundle } from "@/lib/dashboard/satisfaction-types";
import { computeSatisfactionSummary } from "@/lib/dashboard/satisfaction-types";
import { StarRatingDisplay } from "@/components/dashboard/star-rating-input";
import { cn } from "@/lib/utils";

export function ProjectSatisfactionSummaryCard({
  bundle,
  compact = false,
  sidebar = false,
  variant = "card",
  className,
  subtleStars = false,
}: {
  bundle: ProjectSatisfactionBundle;
  compact?: boolean;
  sidebar?: boolean;
  variant?: "card" | "inline";
  className?: string;
  subtleStars?: boolean;
}) {
  const summary = computeSatisfactionSummary(bundle);
  const starSize = subtleStars ? "xs" : "sm";
  const isEmpty =
    summary.stageCount === 0 &&
    summary.fulfillmentTotal === 0 &&
    summary.expectationScore == null &&
    summary.realityScore == null;

  if (isEmpty) {
    if (variant === "inline") {
      return null;
    }

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

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-3",
          className,
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted/80 sm:text-[11px]">
          Zadowolenie
        </span>

        {summary.avgStageScore != null ? (
          subtleStars ? (
            <span className="text-[10px] text-muted sm:text-[11px]">
              Etapy{" "}
              <span className="font-medium text-foreground/90">
                {Math.round(summary.avgStageScore)}/10
              </span>
            </span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="text-[10px] text-muted sm:text-[11px]">Etapy</span>
              <StarRatingDisplay
                value={Math.round(summary.avgStageScore)}
                size="xs"
                subtle
              />
            </span>
          )
        ) : null}

        {summary.fulfillmentPercent != null ? (
          <span className="text-[10px] text-muted sm:text-[11px]">
            Spełnienie{" "}
            <span className="font-medium text-foreground/90">{summary.fulfillmentPercent}%</span>
          </span>
        ) : null}

        {summary.expectationScore != null ? (
          <span className="text-[10px] text-muted sm:text-[11px]">
            Przed{" "}
            <span className="font-medium text-foreground/90">{summary.expectationScore}/10</span>
          </span>
        ) : null}

        {summary.realityScore != null ? (
          <span className="text-[10px] text-muted sm:text-[11px]">
            Po{" "}
            <span className="font-medium text-foreground/90">{summary.realityScore}/10</span>
            {summary.expectationGap != null ? (
              <span
                className={cn(
                  "ml-1",
                  summary.expectationGap >= 0 ? "text-emerald-400/80" : "text-rose-400/80",
                )}
              >
                ({summary.expectationGap >= 0 ? "+" : ""}
                {summary.expectationGap})
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    );
  }

  const metricClass = sidebar
    ? "rounded-lg border border-border/70 bg-surface-muted/20 p-2.5"
    : "rounded-xl border border-border/70 bg-surface-muted/20 p-3";

  function renderStarMetric(
    label: string,
    value: number,
    footer?: ReactNode,
  ) {
    return (
      <div className={metricClass}>
        <p className="text-xs text-muted">{label}</p>
        <div className={cn("mt-1", sidebar && "space-y-1")}>
          <StarRatingDisplay
            value={value}
            size={starSize}
            subtle={subtleStars}
            showScore={!sidebar}
          />
          {sidebar ? (
            <p className="text-[11px] font-medium text-muted">{value}/10</p>
          ) : null}
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/8 via-surface to-surface",
        sidebar ? "p-3" : "p-4",
        className,
      )}
    >
      <p
        className={cn(
          "font-bold uppercase tracking-[0.14em] text-accent",
          sidebar ? "text-[10px]" : "text-xs",
        )}
      >
        Poziom zadowolenia
      </p>

      <div
        className={cn(
          "mt-2.5 grid gap-2",
          sidebar ? "grid-cols-1" : compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
          !sidebar && "mt-3 gap-3",
        )}
      >
        {summary.avgStageScore != null ? (
          <div className={metricClass}>
            <p className="text-xs text-muted">Średnia z etapów</p>
            <div className={cn("mt-1", sidebar && "space-y-1")}>
              <StarRatingDisplay
                value={Math.round(summary.avgStageScore)}
                size={starSize}
                subtle={subtleStars}
                showScore={!sidebar}
              />
              {sidebar ? (
                <p className="text-[11px] font-medium text-muted">
                  {Math.round(summary.avgStageScore)}/10
                </p>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-muted">{summary.stageCount} etap(ów) ocenionych</p>
          </div>
        ) : null}

        {summary.fulfillmentPercent != null ? (
          <div className={metricClass}>
            <p className="text-xs text-muted">Spełnienie oczekiwań</p>
            <p className={cn("mt-1 font-semibold text-foreground", sidebar ? "text-xl" : "text-2xl")}>
              {summary.fulfillmentPercent}%
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {summary.fulfillmentMet}/{summary.fulfillmentTotal} pozycji
            </p>
          </div>
        ) : null}

        {summary.expectationScore != null
          ? renderStarMetric("Oczekiwania (przed)", summary.expectationScore)
          : null}

        {summary.realityScore != null
          ? renderStarMetric(
              "Rzeczywistość (po)",
              summary.realityScore,
              summary.expectationGap != null ? (
                <p
                  className={cn(
                    "mt-1 text-[11px] font-medium",
                    summary.expectationGap >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {summary.expectationGap >= 0 ? "+" : ""}
                  {summary.expectationGap} vs oczekiwania
                </p>
              ) : null,
            )
          : null}
      </div>
    </div>
  );
}
