import type { ServiceIntakePriority, ServiceIntakeStatus } from "@/lib/service-intake/types";
import { isHighCafePriority } from "@/lib/service-intake/cafe-priorities";

const DAY_MS = 24 * 60 * 60 * 1000;

export function serviceIntakeSlaDays(priority: ServiceIntakePriority | null) {
  if (!priority) {
    return 7;
  }
  if (priority === "c") {
    return 1;
  }
  if (priority === "a") {
    return 7;
  }
  if (priority === "f") {
    return 30;
  }
  return null;
}

export function serviceIntakeDueAt(createdAt: string, priority: ServiceIntakePriority | null) {
  const days = serviceIntakeSlaDays(priority);
  if (days == null) {
    return null;
  }
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return null;
  }
  return new Date(created.getTime() + days * DAY_MS).toISOString();
}

export function resolveServiceIntakeDueAt(input: {
  dueAt?: string | null;
  createdAt: string;
  priority: ServiceIntakePriority | null;
}) {
  if (input.dueAt) {
    return input.dueAt;
  }
  return serviceIntakeDueAt(input.createdAt, input.priority);
}

export function isServiceIntakeOverdue(input: {
  dueAt?: string | null;
  createdAt: string;
  priority: ServiceIntakePriority | null;
  status: ServiceIntakeStatus;
  closedAt?: string | null;
}) {
  if (input.closedAt || input.status === "closed" || input.status === "rejected") {
    return false;
  }
  const dueAt = resolveServiceIntakeDueAt(input);
  if (!dueAt) {
    return false;
  }
  return Date.now() > new Date(dueAt).getTime();
}

export function isServiceIntakeNew(status: ServiceIntakeStatus) {
  return status === "new";
}

/** Zgłoszenie czeka na pierwsze przyjęcie — etap „new” bez przypisanej osoby. */
export function isServiceIntakeAwaitingPickup(input: {
  status: ServiceIntakeStatus;
  assigneeId?: string | null;
}) {
  return isServiceIntakeNew(input.status) && !input.assigneeId?.trim();
}

export function isServiceIntakeInactive(status: ServiceIntakeStatus) {
  return status === "closed" || status === "rejected";
}

export function isServiceIntakeActive(status: ServiceIntakeStatus) {
  return !isServiceIntakeInactive(status);
}

export function countActiveServiceIntakes(items: Array<{ status: ServiceIntakeStatus }>) {
  return items.filter((item) => isServiceIntakeActive(item.status)).length;
}

export function countOverdueActiveServiceIntakes(
  items: Array<{
    status: ServiceIntakeStatus;
    dueAt?: string | null;
    createdAt: string;
    priority: ServiceIntakePriority | null;
    closedAt?: string | null;
  }>,
) {
  return items.filter(
    (item) => isServiceIntakeActive(item.status) && isServiceIntakeOverdue(item),
  ).length;
}

export const SERVICE_INTAKE_KANBAN_BADGE_CLASS = {
  empty: "border-border/60 bg-surface-muted/20 text-muted",
  ok: "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
  overdue: "border-rose-500/50 bg-rose-500/15 text-rose-200",
} as const;

export function serviceIntakeKanbanBadgeClass(input: {
  activeCount: number;
  overdueCount: number;
}) {
  if (input.activeCount <= 0) {
    return SERVICE_INTAKE_KANBAN_BADGE_CLASS.empty;
  }
  if (input.overdueCount > 0) {
    return SERVICE_INTAKE_KANBAN_BADGE_CLASS.overdue;
  }
  return SERVICE_INTAKE_KANBAN_BADGE_CLASS.ok;
}

export const SERVICE_INTAKE_STATUS_TONE: Record<
  ServiceIntakeStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  new: "info",
  in_review: "warning",
  converted: "success",
  closed: "neutral",
  rejected: "danger",
};

export const SERVICE_INTAKE_STATUS_BADGE_CLASS = {
  neutral: "border-border/80 bg-surface-muted/40 text-muted",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-200",
} as const;

export const SERVICE_INTAKE_PRIORITY_BADGE_CLASS: Record<ServiceIntakePriority, string> = {
  c: "border-2 border-red-500/85 bg-red-600/20 text-red-100",
  a: "border border-amber-500/75 bg-amber-500/15 text-amber-100",
  f: "border-amber-400/50 bg-amber-400/15 text-amber-100",
  e: "border-emerald-500/50 bg-emerald-500/15 text-emerald-100",
};

export const SERVICE_INTAKE_KANBAN_COLUMNS: ServiceIntakeStatus[] = [
  "new",
  "in_review",
  "converted",
  "closed",
  "rejected",
];

export function serviceIntakePriorityRank(priority: ServiceIntakePriority | null) {
  if (!priority) {
    return 9;
  }
  if (priority === "c") {
    return 0;
  }
  if (priority === "a") {
    return 1;
  }
  if (priority === "f") {
    return 2;
  }
  return 3;
}

export function serviceIntakeNeedsAttention(input: {
  status: ServiceIntakeStatus;
  priority: ServiceIntakePriority | null;
  createdAt: string;
  dueAt?: string | null;
  closedAt?: string | null;
}) {
  return isServiceIntakeNew(input.status) || isHighCafePriority(input.priority ?? "f") || isServiceIntakeOverdue(input);
}
