export const ACTIVITY_ENTITY_TYPES = [
  "project",
  "client",
  "kanban_task",
  "service",
  "work_order",
  "goal",
  "user",
] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "closed",
  "reopened",
  "moved",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  project: "Projekty",
  client: "Klienci",
  kanban_task: "Kanban",
  service: "Oferty",
  work_order: "Zlecenia",
  goal: "Cele",
  user: "Użytkownicy",
};

export type ActivityLogActor = {
  userId: string | null;
  name: string;
};

export type ActivityLogInput = {
  actorUserId?: string | null;
  actorName: string;
  action: ActivityAction | string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  entityLabel?: string;
  summary: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivityLogEntry = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  entityType: ActivityEntityType | string;
  entityId: string | null;
  entityLabel: string;
  summary: string;
  href: string | null;
  metadata: Record<string, unknown>;
};

export type ActivityLogPage = {
  entries: ActivityLogEntry[];
  nextCursor: string | null;
};
