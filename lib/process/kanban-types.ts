export const KANBAN_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type KanbanPriority = (typeof KANBAN_PRIORITIES)[number];

export const KANBAN_PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
  urgent: "Pilny",
};

export type KanbanAuthorSide = "team" | "client";

export type KanbanTemplatePayload = {
  columns: KanbanColumnTemplate[];
  /** Hasło do publicznego linku (zapisane w szablonie; hash trafia na tablicę przy wdrożeniu). */
  publicAccessPassword?: string;
  /** Opcjonalny login — jeśli ustawiony, klient musi go podać razem z hasłem. */
  publicAccessUsername?: string;
  /** Nazwa wyświetlana w komentarzach/historii, gdy nie ma osobnego loginu. */
  publicAuthorName?: string;
};

/** Faza 4 (ROT) — mapowanie kolumny na status ROT, docs/08 D14. Null = kolumna świadomie poza ROT. */
export const ROT_STATUSES = ["CZEKA_NA_ZEWNETRZNE", "W_TOKU", "ZAMKNIETE"] as const;
export type RotStatus = (typeof ROT_STATUSES)[number];

export const ROT_STATUS_LABELS: Record<RotStatus, string> = {
  CZEKA_NA_ZEWNETRZNE: "Czeka na zewnętrzne",
  W_TOKU: "W toku",
  ZAMKNIETE: "Zamknięte",
};

/** D36 — kategoria ROT, tu (nie w lib/rot/types.ts) bo teraz atrybutem kolumny kanban jest tak samo
 *  jak rotStatus (definicja tego typu musi żyć niżej niż oba miejsca, które jej używają). */
export const ROT_CATEGORIES = ["OCZEKIWANIE_DECYZJA_INWESTORA", "POZA_ZAKRESEM"] as const;
export type RotCategory = (typeof ROT_CATEGORIES)[number];

export const ROT_CATEGORY_LABELS: Record<RotCategory, string> = {
  OCZEKIWANIE_DECYZJA_INWESTORA: "Oczekiwanie na decyzję inwestora",
  POZA_ZAKRESEM: "Poza zakresem",
};

/** D36 — atrybuty definicji kolumny w szablonie (process_items.kind='kanban', default_payload.
 *  columns[]). Kopiowane do KanbanColumn przy tworzeniu tablicy (ensureKanbanBoard), tym samym
 *  mechanizmem co title/position. Nadpisywalne per żywa tablica — patrz KanbanColumn niżej. */
export type KanbanColumnTemplate = {
  id: string;
  title: string;
  position: number;
  rotStatus: RotStatus | null;
  category: RotCategory | null;
  isRejestrTematow: boolean;
};

export type KanbanColumn = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  rotStatus: RotStatus | null;
  category: RotCategory | null;
  isRejestrTematow: boolean;
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
  roleItemId: string | null;
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
      { id: crypto.randomUUID(), title: "Problemy w trakcie", position: 0, rotStatus: null, category: null, isRejestrTematow: false },
      { id: crypto.randomUUID(), title: "Rozwiązane", position: 1, rotStatus: null, category: null, isRejestrTematow: false },
      { id: crypto.randomUUID(), title: "Testowane", position: 2, rotStatus: null, category: null, isRejestrTematow: false },
    ],
  };
}

export function getKanbanPublicUrl(token: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/kanban/${token}`;
  }
  return `/kanban/${token}`;
}
