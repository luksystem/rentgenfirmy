import { CheckCircle2, CircleDot, Sparkles } from "lucide-react";
import type { KanbanBoardStats } from "@/lib/process/kanban-task-meta";
import { cn } from "@/lib/utils";

function StatBadge({
  label,
  value,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "emerald";
  icon: typeof CircleDot;
}) {
  const toneClasses = {
    default: "border-border/60 bg-surface/60 text-foreground/90",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        toneClasses[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function KanbanBoardStatsBar({
  stats,
  className,
  compact = false,
}: {
  stats: KanbanBoardStats;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl border border-border/70 bg-surface-muted/30 p-3",
        compact && "p-2.5",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Podsumowanie zgłoszeń</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatBadge label="bez działania" value={stats.openIdle} tone="amber" icon={Sparkles} />
        <StatBadge label="w trakcie" value={stats.inProgress} tone="default" icon={CircleDot} />
        <StatBadge label="zamknięte" value={stats.closed} tone="emerald" icon={CheckCircle2} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Łącznie {stats.total}{" "}
        {stats.total === 1 ? "zgłoszenie" : stats.total < 5 ? "zgłoszenia" : "zgłoszeń"} na tablicy.
      </p>
    </div>
  );
}
