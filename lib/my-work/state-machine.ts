import type { WorkItemStatus } from "@/lib/my-work/types";

/** Dozwolone przejścia statusów (state machine). */
const TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  draft: ["planned", "sent", "pending_ack", "cancelled"],
  planned: ["sent", "pending_ack", "draft", "cancelled"],
  sent: ["pending_ack", "accepted", "needs_clarification", "risk_reported", "cancelled"],
  pending_ack: ["accepted", "needs_clarification", "risk_reported", "not_done", "cancelled"],
  accepted: ["in_progress", "blocked", "needs_clarification", "risk_reported", "cancelled"],
  needs_clarification: ["sent", "accepted", "in_progress", "cancelled"],
  risk_reported: ["blocked", "in_progress", "needs_clarification", "cancelled"],
  in_progress: ["blocked", "done", "pending_verification", "deferred", "not_done", "cancelled"],
  blocked: ["in_progress", "deferred", "not_done", "cancelled"],
  done: ["pending_verification", "in_progress"],
  pending_verification: ["verified", "in_progress", "not_done"],
  verified: [],
  not_done: ["deferred", "sent", "cancelled"],
  deferred: ["sent", "planned", "in_progress", "cancelled"],
  cancelled: [],
};

export function canTransitionWorkItemStatus(from: WorkItemStatus, to: WorkItemStatus) {
  if (from === to) {
    return true;
  }
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertWorkItemStatusTransition(from: WorkItemStatus, to: WorkItemStatus) {
  if (!canTransitionWorkItemStatus(from, to)) {
    throw new Error(`Niedozwolona zmiana statusu: ${from} → ${to}`);
  }
}

/** Kolumny widoku Kanban → statusy przypisane do kolumny. */
export const KANBAN_COLUMN_GROUPS = [
  { id: "pending_ack", label: "Do zapoznania", statuses: ["sent", "pending_ack"] as WorkItemStatus[] },
  { id: "accepted", label: "Przyjęte", statuses: ["accepted", "needs_clarification"] as WorkItemStatus[] },
  { id: "in_progress", label: "W realizacji", statuses: ["in_progress", "risk_reported"] as WorkItemStatus[] },
  { id: "blocked", label: "Zablokowane", statuses: ["blocked"] as WorkItemStatus[] },
  { id: "pending_verification", label: "Do weryfikacji", statuses: ["done", "pending_verification"] as WorkItemStatus[] },
  {
    id: "completed",
    label: "Zakończone",
    statuses: ["verified", "not_done", "deferred", "cancelled"] as WorkItemStatus[],
  },
] as const;

export type KanbanColumnGroupId = (typeof KANBAN_COLUMN_GROUPS)[number]["id"];

export function kanbanColumnForStatus(status: WorkItemStatus): KanbanColumnGroupId {
  const group = KANBAN_COLUMN_GROUPS.find((entry) => entry.statuses.includes(status));
  return group?.id ?? "in_progress";
}

export function statusesForKanbanColumn(columnId: KanbanColumnGroupId): WorkItemStatus[] {
  const group = KANBAN_COLUMN_GROUPS.find((entry) => entry.id === columnId);
  return group ? [...group.statuses] : [];
}

export function defaultStatusForKanbanColumn(columnId: KanbanColumnGroupId): WorkItemStatus {
  const statuses = statusesForKanbanColumn(columnId);
  return statuses[0] ?? "in_progress";
}
