import type { KanbanPriority, KanbanTask } from "@/lib/process/kanban-types";
import { getMilestoneDateStatus, MILESTONE_DATE_STATUS_CLASSES } from "@/lib/process/dates";
import type { KanbanTaskActivity } from "@/lib/process/kanban-task-meta";
import { sortKanbanColumnTasksWithMode, type KanbanColumnSortMode } from "@/lib/process/kanban-task-meta";

export const KANBAN_PRIORITY_DOT_CLASSES: Record<KanbanPriority, string> = {
  low: "bg-slate-400",
  normal: "bg-sky-400",
  high: "bg-orange-400",
  urgent: "bg-rose-500",
};

export function getKanbanDueDateTextClasses(dueDate: string | null | undefined) {
  const status = getMilestoneDateStatus(dueDate);
  switch (status) {
    case "overdue":
      return "text-rose-300";
    case "warning7":
      return "text-orange-200";
    case "warning30":
      return "text-yellow-200";
    case "ok":
      return "text-emerald-300";
    default:
      return "text-muted";
  }
}

export function getKanbanTaskAgingClasses(activity?: KanbanTaskActivity) {
  if (!activity?.isStale) {
    return "border-border/70 bg-surface/60 hover:border-accent/30";
  }

  if (activity.staleDays >= 14) {
    return "border-amber-500/45 bg-amber-500/12 hover:border-amber-400/55";
  }

  return "border-amber-500/30 bg-amber-500/8 hover:border-amber-400/45";
}

export function getKanbanClosedTaskClasses() {
  return "border-border/60 bg-surface/45 hover:border-accent/30";
}

/** @deprecated Use getKanbanTaskAgingClasses for card background */
export function getKanbanTaskCardClasses(dueDate: string | null | undefined) {
  const status = getMilestoneDateStatus(dueDate);
  return MILESTONE_DATE_STATUS_CLASSES[status].badge;
}

export const KANBAN_DRAG_HINT =
  "Przesuń zgłoszenie na kolejny etap metodą drag and drop.";

export const KANBAN_MOBILE_MOVE_HINT =
  "Otwórz zgłoszenie i wybierz etap, aby przenieść je na kolejny krok procesu.";

export const KANBAN_BOARD_ROOT_CLASS =
  "flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden";

export const KANBAN_BOARD_HEADER_CLASS =
  "flex w-full min-w-0 max-w-full shrink-0 flex-col gap-3 overflow-x-hidden";

export const KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS =
  "flex min-h-0 min-w-0 w-full max-w-full flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:snap-none md:flex-row md:overflow-hidden md:pb-0 [&::-webkit-scrollbar]:hidden";

export const KANBAN_MOBILE_COLUMN_SHELL_CLASS =
  "flex w-[min(100%,22rem)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface-muted/40 shadow-sm md:min-h-0 md:w-auto md:min-w-0 md:flex-1 md:snap-align-none";

export const KANBAN_MOBILE_COLUMN_BODY_CLASS =
  "flex min-h-[min(52vh,28rem)] flex-1 flex-col gap-2.5 overflow-y-auto p-3 md:min-h-0";

export function sortKanbanColumnTasks(tasks: KanbanTask[], sortMode: KanbanColumnSortMode = "position") {
  return sortKanbanColumnTasksWithMode(tasks, sortMode);
}

export function countOpenKanbanTasks(tasks: KanbanTask[]) {
  return tasks.filter((task) => !task.closedAt).length;
}
