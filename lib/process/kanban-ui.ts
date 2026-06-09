import type { KanbanPriority, KanbanTask } from "@/lib/process/kanban-types";
import { getMilestoneDateStatus, MILESTONE_DATE_STATUS_CLASSES } from "@/lib/process/dates";

export const KANBAN_PRIORITY_DOT_CLASSES: Record<KanbanPriority, string> = {
  low: "bg-slate-400",
  normal: "bg-sky-400",
  high: "bg-orange-400",
  urgent: "bg-rose-500",
};

export function getKanbanTaskCardClasses(dueDate: string | null | undefined) {
  const status = getMilestoneDateStatus(dueDate);
  return MILESTONE_DATE_STATUS_CLASSES[status].badge;
}

export const KANBAN_DRAG_HINT =
  "Przesuń zgłoszenie na kolejny etap metodą drag and drop.";

export const KANBAN_MOBILE_MOVE_HINT =
  "Otwórz zgłoszenie i wybierz etap, aby przenieść je na kolejny krok procesu.";

export function sortKanbanColumnTasks(tasks: KanbanTask[]) {
  return [...tasks].sort((a, b) => {
    const aClosed = Boolean(a.closedAt);
    const bClosed = Boolean(b.closedAt);
    if (aClosed !== bClosed) {
      return aClosed ? 1 : -1;
    }
    return a.position - b.position;
  });
}

export function countOpenKanbanTasks(tasks: KanbanTask[]) {
  return tasks.filter((task) => !task.closedAt).length;
}
