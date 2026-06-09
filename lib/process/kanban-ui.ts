import type { KanbanPriority } from "@/lib/process/kanban-types";
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
