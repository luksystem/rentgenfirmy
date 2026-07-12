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
  /** Hasło do publicznego linku (zapisane w szablonie; hash trafia na tablicę przy wdrożeniu). */
  publicAccessPassword?: string;
  /** Opcjonalny login — jeśli ustawiony, klient musi go podać razem z hasłem. */
  publicAccessUsername?: string;
  /** Nazwa wyświetlana w komentarzach/historii, gdy nie ma osobnego loginu. */
  publicAuthorName?: string;
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
  assigneeName: string | null;
  assigneeId: string | null;
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

export type KanbanTaskReaction = {
  id: string;
  taskId: string;
  emoji: string;
  authorName: string;
  authorSide: KanbanAuthorSide;
  createdAt: string;
};

export function isOwnKanbanComment(
  comment: Pick<KanbanComment, "authorName" | "authorSide">,
  authorName: string,
  authorSide: KanbanAuthorSide,
) {
  return (
    comment.authorSide === authorSide &&
    comment.authorName.trim().toLocaleLowerCase("pl") === authorName.trim().toLocaleLowerCase("pl")
  );
}

export const KANBAN_TASK_EVENT_TYPES = ["created", "closed", "reopened"] as const;
export type KanbanTaskEventType = (typeof KANBAN_TASK_EVENT_TYPES)[number];

export type KanbanTaskEvent = {
  id: string;
  taskId: string;
  eventType: KanbanTaskEventType;
  authorName: string;
  authorSide: KanbanAuthorSide;
  createdAt: string;
};

export type KanbanAttachment = {
  id: string;
  taskId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  mediaKind: "image" | "video";
  sizeBytes: number;
  position: number;
  isCardCover: boolean;
  uploadedBySide: KanbanAuthorSide;
  uploadedByName: string;
  createdAt: string;
  url: string | null;
};

export type KanbanBoard = {
  id: string;
  projectProcessItemId: string;
  projectId: string | null;
  projectName: string;
  projectType: string | null;
  publicToken: string;
  publicEnabled: boolean;
  /** Czy tablica wymaga hasła na publicznym linku (hash nigdy nie trafia do klienta). */
  publicAccessConfigured: boolean;
  /** Czy klient musi podać login oprócz hasła. */
  publicAccessUsernameRequired: boolean;
  publicAccessUsername: string | null;
  publicAuthorName: string;
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  comments: KanbanComment[];
  reactions: KanbanTaskReaction[];
  events: KanbanTaskEvent[];
  attachments: KanbanAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type KanbanPublicAccessInfo = {
  authRequired: boolean;
  legacyNameRequired: boolean;
  usernameRequired: boolean;
  authorDisplayName: string;
};

export type KanbanPublicContext = {
  projectId: string | null;
  projectName: string;
  projectType: string | null;
  clientName: string | null;
  assigneeOptions: string[];
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
