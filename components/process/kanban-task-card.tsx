"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronRight } from "lucide-react";
import { KanbanAttachmentPreview } from "@/components/process/kanban-attachment-gallery";
import { KanbanTaskReactionPreview } from "@/components/process/kanban-task-reactions";
import { formatMilestoneDate } from "@/lib/process/dates";
import {
  KANBAN_PRIORITY_LABELS,
  type KanbanAttachment,
  type KanbanPriority,
  type KanbanTask,
  type KanbanTaskReaction,
} from "@/lib/process/kanban-types";
import type { KanbanTaskActivity } from "@/lib/process/kanban-task-meta";
import {
  getKanbanClosedTaskClasses,
  getKanbanDueDateTextClasses,
  getKanbanTaskAgingClasses,
  KANBAN_PRIORITY_DOT_CLASSES,
} from "@/lib/process/kanban-ui";
import { cn } from "@/lib/utils";

const TOUCH_DRAG_THRESHOLD_PX = 8;

function resolveKanbanColumnId(clientX: number, clientY: number) {
  const target = document.elementFromPoint(clientX, clientY);
  return target?.closest("[data-column-id]")?.getAttribute("data-column-id") ?? null;
}

export function KanbanTaskCardView({
  task,
  attachments = [],
  reactions = [],
  activity,
  isNew,
  draggable = true,
  showDueDate = true,
  showAssignee = false,
  showProjectLabel = false,
  projectName,
  showChevron = false,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragHover,
  onDragDrop,
}: {
  task: KanbanTask;
  attachments?: KanbanAttachment[];
  reactions?: KanbanTaskReaction[];
  activity?: KanbanTaskActivity;
  isNew?: boolean;
  draggable?: boolean;
  showDueDate?: boolean;
  showAssignee?: boolean;
  showProjectLabel?: boolean;
  projectName?: string;
  showChevron?: boolean;
  isDragging?: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd?: () => void;
  onDragHover?: (columnId: string | null) => void;
  onDragDrop?: (columnId: string) => void;
}) {
  const isClosed = Boolean(task.closedAt);
  const canDrag = draggable;
  const pointerDragRef = useRef<{
    pointerId: number;
    started: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!canDrag || event.pointerType === "mouse" || event.button !== 0) {
      return;
    }

    pointerDragRef.current = {
      pointerId: event.pointerId,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = pointerDragRef.current;
    if (!canDrag || !dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (!dragState.started) {
      if (distance < TOUCH_DRAG_THRESHOLD_PX) {
        return;
      }
      dragState.started = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      suppressClickRef.current = true;
      onDragStart();
    }

    event.preventDefault();
    onDragHover?.(resolveKanbanColumnId(event.clientX, event.clientY));
  }

  function finishPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = pointerDragRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    if (dragState.started) {
      const columnId = resolveKanbanColumnId(event.clientX, event.clientY);
      if (columnId) {
        onDragDrop?.(columnId);
      }
      onDragEnd?.();
      event.preventDefault();
      event.stopPropagation();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerDragRef.current = null;
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onOpen();
  }

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", task.id);
              onDragStart();
            }
          : undefined
      }
      onDragEnd={canDrag ? onDragEnd : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onClick={handleClick}
      className={cn(
        "relative w-full rounded-2xl border px-3.5 py-3 text-left text-sm shadow-sm transition hover:shadow-md",
        canDrag && "touch-manipulation",
        isClosed ? getKanbanClosedTaskClasses() : getKanbanTaskAgingClasses(activity),
        isNew && !isClosed && "ring-2 ring-rose-500/50",
        isDragging && "scale-[0.98] opacity-35 ring-2 ring-accent/30",
      )}
    >
      <span
        className={cn(
          "absolute right-3 top-3 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/10",
          KANBAN_PRIORITY_DOT_CLASSES[task.priority],
        )}
        title={`Priorytet: ${KANBAN_PRIORITY_LABELS[task.priority]}`}
      />
      {activity?.isStale && !isClosed ? (
        <span className="absolute left-3 top-3 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
          {activity.staleDays}d bez ruchu
        </span>
      ) : null}
      <KanbanAttachmentPreview attachments={attachments} />
      {showProjectLabel && projectName ? (
        <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-wide text-accent/80">{projectName}</p>
      ) : null}
      <p
        className={cn(
          "font-medium leading-snug",
          isClosed ? "text-foreground/75 line-through decoration-foreground/40" : "text-foreground",
          showChevron ? "pr-8" : "pr-4",
          activity?.isStale && !isClosed ? "pt-4" : null,
        )}
      >
        {task.title}
      </p>
      {showAssignee && task.assigneeName ? (
        <p className="mt-1 truncate text-[10px] text-muted">{task.assigneeName}</p>
      ) : null}
      {isClosed ? (
        <p className="mt-2 inline-flex rounded-md bg-surface/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Zamknięte
        </p>
      ) : showDueDate || isNew ? (
        <p className={cn("mt-2 text-[11px] font-medium", getKanbanDueDateTextClasses(task.dueDate))}>
          {showDueDate ? (task.dueDate ? formatMilestoneDate(task.dueDate) : "Bez terminu") : null}
          {showDueDate && isNew ? " · " : null}
          {isNew ? "NOWY" : null}
        </p>
      ) : null}
      <KanbanTaskReactionPreview taskId={task.id} reactions={reactions} />
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
