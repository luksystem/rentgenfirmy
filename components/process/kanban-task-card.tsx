"use client";

import { formatMilestoneDate } from "@/lib/process/dates";
import {
  KANBAN_PRIORITY_LABELS,
  type KanbanPriority,
  type KanbanTask,
} from "@/lib/process/kanban-types";
import {
  getKanbanTaskCardClasses,
  KANBAN_PRIORITY_DOT_CLASSES,
} from "@/lib/process/kanban-ui";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export function KanbanTaskCardView({
  task,
  isNew,
  draggable = true,
  showDueDate = true,
  showChevron = false,
  onOpen,
  onDragStart,
}: {
  task: KanbanTask;
  isNew?: boolean;
  draggable?: boolean;
  showDueDate?: boolean;
  showChevron?: boolean;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  const isClosed = Boolean(task.closedAt);

  return (
    <button
      type="button"
      draggable={draggable && !isClosed}
      onDragStart={draggable && !isClosed ? onDragStart : undefined}
      onClick={onOpen}
      className={cn(
        "relative w-full rounded-2xl border px-3.5 py-3 text-left text-sm shadow-sm transition hover:border-accent/40 hover:shadow-md",
        isClosed
          ? "border-border/50 bg-surface/30 opacity-60 grayscale"
          : getKanbanTaskCardClasses(task.dueDate),
        isNew && !isClosed && "ring-2 ring-rose-500/50",
      )}
    >
      <span
        className={cn(
          "absolute right-3 top-3 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/10",
          KANBAN_PRIORITY_DOT_CLASSES[task.priority],
        )}
        title={`Priorytet: ${KANBAN_PRIORITY_LABELS[task.priority]}`}
      />
      <p className={cn("font-medium leading-snug", isClosed ? "text-muted line-through" : "text-foreground", showChevron ? "pr-8" : "pr-4")}>
        {task.title}
      </p>
      {isClosed ? (
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">Zamknięte</p>
      ) : showDueDate || isNew ? (
        <p className="mt-2 text-[11px] font-medium opacity-90">
          {showDueDate ? (task.dueDate ? formatMilestoneDate(task.dueDate) : "Bez terminu") : null}
          {showDueDate && isNew ? " · " : null}
          {isNew ? "NOWY" : null}
        </p>
      ) : null}
      {showChevron ? (
        <ChevronRight className="absolute bottom-3 right-3 h-4 w-4 text-muted/70" aria-hidden />
      ) : null}
    </button>
  );
}

export function KanbanPriorityPicker({
  value,
  onChange,
  disabled,
}: {
  value: KanbanPriority;
  onChange: (priority: KanbanPriority) => void;
  disabled?: boolean;
}) {
  const options: KanbanPriority[] = ["low", "normal", "high", "urgent"];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((priority) => (
        <button
          key={priority}
          type="button"
          disabled={disabled}
          title={KANBAN_PRIORITY_LABELS[priority]}
          onClick={() => onChange(priority)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition",
            value === priority
              ? "border-accent/50 bg-accent/15 text-foreground"
              : "border-border/70 bg-surface/50 text-muted hover:border-accent/30",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", KANBAN_PRIORITY_DOT_CLASSES[priority])} />
          {KANBAN_PRIORITY_LABELS[priority]}
        </button>
      ))}
    </div>
  );
}
