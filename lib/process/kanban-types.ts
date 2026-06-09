export const KANBAN_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type KanbanPriority = (typeof KANBAN_PRIORITIES)[number];

export const KANBAN_PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
  urgent: "Pilny",
};

export type KanbanAuthorSide = "team" | "client";

export type KanbanColumnTemplate = {
  id: string;
  title: string;
  position: number;
};

export type KanbanTemplatePayload = {
  columns: KanbanColumnTemplate[];
};

export type KanbanColumn = {
  id: string;
  boardId: string;
  title: string;
  position: number;
};

export type KanbanTask = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: KanbanPriority;
  dueDate: string | null;
  position: number;
  closedAt: string | null;
  createdBySide: KanbanAuthorSide;
  isNewForTeam: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KanbanComment = {
  id: string;
  taskId: string;
  authorName: string;
  authorSide: KanbanAuthorSide;
  body: string;
  createdAt: string;
};

export type KanbanBoard = {
  id: string;
  projectProcessItemId: string;
  publicToken: string;
  publicEnabled: boolean;
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  comments: KanbanComment[];
  createdAt: string;
  updatedAt: string;
};

export function defaultKanbanTemplatePayload(): KanbanTemplatePayload {
  return {
    columns: [
      { id: crypto.randomUUID(), title: "Problemy w trakcie", position: 0 },
      { id: crypto.randomUUID(), title: "Rozwiązane", position: 1 },
      { id: crypto.randomUUID(), title: "Testowane", position: 2 },
    ],
  };
}

export function getKanbanPublicUrl(token: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/kanban/${token}`;
  }
  return `/kanban/${token}`;
}
