import type { WorkItemStatus, WorkItemView } from "@/lib/my-work/types";
import { isTerminalWorkItemStatus } from "@/lib/my-work/types";

export type ListSectionId =
  | "today"
  | "tomorrow"
  | "this_week"
  | "overdue"
  | "blocked"
  | "pending_ack"
  | "needs_comment"
  | "completed";

export const LIST_SECTIONS: { id: ListSectionId; label: string }[] = [
  { id: "today", label: "Dzisiaj" },
  { id: "tomorrow", label: "Jutro" },
  { id: "this_week", label: "Ten tydzień" },
  { id: "overdue", label: "Zaległe" },
  { id: "blocked", label: "Zablokowane" },
  { id: "pending_ack", label: "Do zapoznania" },
  { id: "needs_comment", label: "Do skomentowania" },
  { id: "completed", label: "Wykonane" },
];

function toDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function todayKey(reference = new Date()) {
  return reference.toISOString().slice(0, 10);
}

function tomorrowKey(reference = new Date()) {
  const d = new Date(reference);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isThisWeek(dateKey: string | null, reference = new Date()) {
  if (!dateKey) {
    return false;
  }
  const date = new Date(`${dateKey}T12:00:00`);
  const start = new Date(reference);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function effectiveDueDate(item: WorkItemView) {
  return item.plannedEnd ?? item.dueDate;
}

export function itemMatchesListSection(item: WorkItemView, sectionId: ListSectionId, now = new Date()) {
  const dueKey = toDateKey(effectiveDueDate(item));
  const today = todayKey(now);
  const tomorrow = tomorrowKey(now);

  switch (sectionId) {
    case "today":
      return dueKey === today && !isTerminalWorkItemStatus(item.status);
    case "tomorrow":
      return dueKey === tomorrow && !isTerminalWorkItemStatus(item.status);
    case "this_week":
      return isThisWeek(dueKey, now) && dueKey !== today && dueKey !== tomorrow && !isTerminalWorkItemStatus(item.status);
    case "overdue":
      return Boolean(dueKey && dueKey < today && !isTerminalWorkItemStatus(item.status));
    case "blocked":
      return item.status === "blocked";
    case "pending_ack":
      return item.status === "sent" || item.status === "pending_ack";
    case "needs_comment":
      return (
        item.unreadCommentCount > 0 ||
        item.status === "needs_clarification" ||
        item.status === "risk_reported"
      );
    case "completed": {
      if (item.status !== "verified" && item.status !== "done") {
        return false;
      }
      const completedAt = item.completedAt ?? item.verifiedAt ?? item.updatedAt;
      const completedKey = toDateKey(completedAt);
      if (!completedKey) {
        return false;
      }
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return completedKey >= weekAgo.toISOString().slice(0, 10);
    }
    default:
      return false;
  }
}

export function groupItemsByListSection(items: WorkItemView[], now = new Date()) {
  const grouped = new Map<ListSectionId, WorkItemView[]>();
  for (const section of LIST_SECTIONS) {
    grouped.set(section.id, []);
  }
  for (const item of items) {
    for (const section of LIST_SECTIONS) {
      if (itemMatchesListSection(item, section.id, now)) {
        grouped.get(section.id)!.push(item);
      }
    }
  }
  return grouped;
}

export function itemNeedsReaction(item: WorkItemView) {
  return (
    item.status === "sent" ||
    item.status === "pending_ack" ||
    item.status === "needs_clarification" ||
    item.unreadCommentCount > 0
  );
}

export function itemIsOverdue(item: WorkItemView, now = new Date()) {
  const dueKey = toDateKey(effectiveDueDate(item));
  const today = todayKey(now);
  return Boolean(dueKey && dueKey < today && !isTerminalWorkItemStatus(item.status));
}

export function filterWorkItems(items: WorkItemView[], filters: {
  projectId?: string | null;
  clientId?: string | null;
  status?: WorkItemStatus | null;
  priority?: string | null;
  sourceType?: string | null;
  overdueOnly?: boolean;
  needsReactionOnly?: boolean;
  ownOnly?: boolean;
  sharedOnly?: boolean;
  aiGeneratedOnly?: boolean;
  currentUserId?: string | null;
}) {
  return items.filter((item) => {
    if (filters.projectId && item.projectId !== filters.projectId) return false;
    if (filters.clientId && item.clientId !== filters.clientId) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.sourceType && item.sourceType !== filters.sourceType) return false;
    if (filters.overdueOnly && !itemIsOverdue(item)) return false;
    if (filters.needsReactionOnly && !itemNeedsReaction(item)) return false;
    if (filters.aiGeneratedOnly && !item.aiGenerated) return false;
    if (filters.currentUserId) {
      if (filters.ownOnly && item.assignedUserId !== filters.currentUserId) return false;
      if (filters.sharedOnly && !item.isSupporting) return false;
    }
    return true;
  });
}
