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

export function isServiceIntakeOverdue(input: {
  createdAt: string;
  priority: ServiceIntakePriority | null;
  status: ServiceIntakeStatus;
  closedAt?: string | null;
}) {
  if (input.closedAt || input.status === "closed" || input.status === "rejected") {
    return false;
  }
  const dueAt = serviceIntakeDueAt(input.createdAt, input.priority);
  if (!dueAt) {
    return false;
  }
  return Date.now() > new Date(dueAt).getTime();
}

export function isServiceIntakeNew(status: ServiceIntakeStatus) {
  return status === "new";
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
  c: "border-rose-500/50 bg-rose-600/20 text-rose-100",
  a: "border-orange-500/50 bg-orange-500/15 text-orange-100",
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
}) {
  return isServiceIntakeNew(input.status) || isHighCafePriority(input.priority ?? "f") || isServiceIntakeOverdue(input);
}
