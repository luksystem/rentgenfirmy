"use client";

import { ArrowRightLeft } from "lucide-react";
import { KANBAN_MOBILE_MOVE_HINT } from "@/lib/process/kanban-ui";
import { cn } from "@/lib/utils";

export function KanbanMobileColumnNav({
  columns,
  activeColumnId,
  onSelect,
  openCountForColumn,
  badgeToneForColumn,
}: {
  columns: Array<{ id: string; title: string }>;
  activeColumnId: string;
  onSelect: (columnId: string) => void;
  openCountForColumn: (columnId: string) => number;
  badgeToneForColumn?: (columnId: string) => "empty" | "ok" | "overdue";
}) {
  return (
    <div className="min-w-0 max-w-full md:hidden">
      <div className="shrink-0 rounded-xl border border-accent/20 bg-accent/10 px-3.5 py-2.5">
        <p className="flex items-start gap-2 text-sm leading-snug text-foreground/90">
          <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {KANBAN_MOBILE_MOVE_HINT}
        </p>
      </div>

      <div className="mt-3 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {columns.map((column) => {
          const count = openCountForColumn(column.id);
          const isActive = column.id === activeColumnId;
          const tone = badgeToneForColumn?.(column.id) ?? (count > 0 ? "ok" : "empty");

          return (
            <button
              key={column.id}
              type="button"
              onClick={() => onSelect(column.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition",
                isActive
                  ? "border-accent/50 bg-accent text-accent-foreground shadow-sm"
                  : "border-border/70 bg-surface/60 text-muted hover:border-accent/30 hover:text-foreground",
              )}
            >
              {column.title}
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 tabular-nums",
                  isActive ? "opacity-90" : "opacity-100",
                  tone === "overdue"
                    ? "bg-rose-500/20 font-semibold text-rose-200"
                    : tone === "ok"
                      ? "bg-emerald-500/20 font-semibold text-emerald-200"
                      : "opacity-70",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
