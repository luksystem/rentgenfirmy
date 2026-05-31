import { cn } from "@/lib/utils";
import type { QuickWin } from "@/lib/types";

const severityStyles = {
  info: "border-sky-200 bg-sky-50",
  warning: "border-amber-200 bg-amber-50",
  critical: "border-rose-200 bg-rose-50",
};

const severityLabels = {
  info: "Info",
  warning: "Uwaga",
  critical: "Pilne",
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
      {items.map((win) => (
        <article
          key={win.id}
          className={cn(
            "rounded-2xl border p-4",
            severityStyles[win.severity],
            compact && "p-3",
          )}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {severityLabels[win.severity]}
            </span>
            <h3 className={cn("font-semibold text-slate-900", compact && "text-sm")}>
              {win.title}
            </h3>
          </div>
          <p className={cn("text-sm text-slate-700", compact && "text-xs")}>
            {win.description}
          </p>
          <p className={cn("mt-2 text-sm font-medium text-slate-900", compact && "text-xs")}>
            → {win.action}
          </p>
        </article>
      ))}
    </div>
  );
}
