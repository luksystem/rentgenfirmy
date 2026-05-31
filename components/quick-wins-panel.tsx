import { cn } from "@/lib/utils";
import type { QuickWin } from "@/lib/types";

const severityStyles = {
  info: "panel-info",
  warning: "panel-warning",
  critical: "panel-danger",
};

const severityLabels = {
  info: "Info",
  warning: "Uwaga",
  critical: "Pilne",
};

const severityDots = {
  info: "bg-teal-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400",
};

export function QuickWinsPanel({
  wins,
  limit,
  compact = false,
}: {
  wins: QuickWin[];
  limit?: number;
  compact?: boolean;
}) {
  const items = limit ? wins.slice(0, limit) : wins;

  return (
    <div className="grid gap-3">
      {items.map((win, index) => (
        <article
          key={win.id}
          className={cn(
            "rounded-xl border p-4",
            severityStyles[win.severity],
            compact && "p-3",
          )}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", severityDots[win.severity])}
                aria-hidden
              />
              {severityLabels[win.severity]}
            </span>
            <span className="text-xs font-medium text-muted/70">#{index + 1}</span>
            <h3 className={cn("font-semibold text-foreground", compact && "text-sm")}>
              {win.title}
            </h3>
          </div>
          <p className={cn("text-sm leading-6 text-muted", compact && "text-xs leading-5")}>
            {win.description}
          </p>
          <p
            className={cn(
              "mt-2 text-sm font-medium text-accent",
              compact && "text-xs",
            )}
          >
            → {win.action}
          </p>
        </article>
      ))}
    </div>
  );
}
