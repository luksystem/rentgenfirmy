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

export function KanbanTaskCardView({
  task,
  isNew,
  onOpen,
  onDragStart,
}: {
  task: KanbanTask;
  isNew?: boolean;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        "relative w-full rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-accent/40",
        getKanbanTaskCardClasses(task.dueDate),
        isNew && "ring-2 ring-rose-500/50",
      )}
    >
      <span
        className={cn(
          "absolute right-2.5 top-2.5 h-2.5 w-2.5 shrink-0 rounded-full",
          KANBAN_PRIORITY_DOT_CLASSES[task.priority],
        )}
        title={`Priorytet: ${KANBAN_PRIORITY_LABELS[task.priority]}`}
      />
      <p className="pr-4 font-medium leading-snug">{task.title}</p>
      <p className="mt-1.5 text-[11px] opacity-85">
        {task.dueDate ? formatMilestoneDate(task.dueDate) : "Bez terminu"}
        {isNew ? " · NOWY" : ""}
      </p>
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
