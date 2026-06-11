import { LayoutGrid, UserRound } from "lucide-react";
import { KanbanBoardStatsBar } from "@/components/process/kanban-board-stats-bar";
import type { KanbanBoardStats } from "@/lib/process/kanban-task-meta";
import type { KanbanPublicContext } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";

export function PublicKanbanHeader({
  context,
  stats,
  compact = false,
}: {
  context: KanbanPublicContext;
  stats?: KanbanBoardStats | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-surface-elevated via-surface-muted/40 to-accent/10 p-4 shadow-soft sm:p-5",
        compact && "rounded-xl p-3.5 sm:p-4",
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Projekt</p>
            <h1
              className={cn(
                "font-semibold leading-tight text-foreground",
                compact ? "text-lg" : "text-xl sm:text-2xl",
              )}
            >
              {context.projectName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-2.5 py-1 text-xs text-foreground/90">
                <UserRound className="h-3.5 w-3.5 text-muted" />
                {context.clientName ?? "Klient nieprzypisany"}
              </span>
              <span className="text-xs text-muted">Tablica optymalizacji Smart Home</span>
            </div>
          </div>
        </div>

        {stats ? (
          <KanbanBoardStatsBar stats={stats} compact={compact} className="border-border/60 bg-surface/40 lg:max-w-md" />
        ) : null}
      </div>
    </div>
  );
}
