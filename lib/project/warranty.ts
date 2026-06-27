import type { Project } from "@/lib/types";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { formatDate } from "@/lib/utils";

export type WarrantyStatus = "none" | "active" | "expiring_soon" | "expired" | "pending_extension";

export type WarrantyStatusInfo = {
  status: WarrantyStatus;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type ProjectWarrantyFields = Pick<
  Project,
  "warrantyEndsAt" | "systemHandoverAt" | "warrantyDurationMonths"
>;

const WARRANTY_EXPIRY_NOTICE_DAYS = 30;

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addMonthsToDate(isoDate: string, months: number) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + months);
    return fallback.toISOString().slice(0, 10);
  }
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function computeWarrantyEndsAt(
  systemHandoverAt: string | null | undefined,
  warrantyDurationMonths: number | null | undefined,
) {
  const handover = systemHandoverAt?.trim();
  const months = warrantyDurationMonths ?? 0;
  if (!handover || !Number.isFinite(months) || months <= 0) {
    return null;
  }
  return addMonthsToDate(handover, months);
}

export function resolveProjectWarrantyEndsAt(project: ProjectWarrantyFields) {
  if (project.warrantyEndsAt) {
    return project.warrantyEndsAt.slice(0, 10);
  }
  return computeWarrantyEndsAt(project.systemHandoverAt, project.warrantyDurationMonths);
}

export function getWarrantyDaysRemaining(
  project: ProjectWarrantyFields,
  referenceDate = new Date(),
): number | null {
  const endsAtValue = resolveProjectWarrantyEndsAt(project);
  if (!endsAtValue) {
    return null;
  }

  const endsAt = startOfDay(new Date(`${endsAtValue}T12:00:00`));
  const today = startOfDay(referenceDate);
  const diffMs = endsAt.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWarrantyExpiringSoon(project: ProjectWarrantyFields, withinDays = WARRANTY_EXPIRY_NOTICE_DAYS) {
  const daysRemaining = getWarrantyDaysRemaining(project);
  return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= withinDays;
}

export function getProjectDurationDays(project: Pick<Project, "createdAt">, referenceDate = new Date()) {
  const createdRaw = project.createdAt?.slice(0, 10);
  if (!createdRaw) {
    return 0;
  }
  const created = startOfDay(new Date(`${createdRaw}T12:00:00`));
  const today = startOfDay(referenceDate);
  const diffMs = today.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatProjectDuration(project: Pick<Project, "createdAt">) {
  const days = getProjectDurationDays(project);
  if (days === 1) {
    return "1 dzień";
  }
  return `${days} dni`;
}

export function formatWarrantyDurationMonths(months: number | null | undefined) {
  if (!months || months <= 0) {
    return "—";
  }
  if (months === 1) {
    return "1 miesiąc";
  }
  if (months >= 2 && months <= 4) {
    return `${months} miesiące`;
  }
  return `${months} miesięcy`;
}

export function formatSystemHandoverDate(project: Pick<Project, "systemHandoverAt">) {
  if (!project.systemHandoverAt) {
    return "—";
  }
  return formatDate(project.systemHandoverAt);
}

export function getWarrantyStatus(
  project: ProjectWarrantyFields,
  options?: { hasPendingExtension?: boolean },
): WarrantyStatusInfo {
  if (options?.hasPendingExtension) {
    return { status: "pending_extension", label: "Oczekuje przedłużenia", tone: "warning" };
  }

  const endsAtValue = resolveProjectWarrantyEndsAt(project);
  if (!endsAtValue) {
    return { status: "none", label: "Brak gwarancji", tone: "neutral" };
  }

  const daysRemaining = getWarrantyDaysRemaining(project);
  if (daysRemaining === null) {
    return { status: "none", label: "Brak gwarancji", tone: "neutral" };
  }

  if (daysRemaining < 0) {
    return { status: "expired", label: "Wygasła", tone: "danger" };
  }

  if (daysRemaining <= WARRANTY_EXPIRY_NOTICE_DAYS) {
    return {
      status: "expiring_soon",
      label: daysRemaining === 0 ? "Kończy się dziś" : `Kończy się za ${daysRemaining} dni`,
      tone: "warning",
    };
  }

  return { status: "active", label: "Aktywna", tone: "success" };
}

export function formatWarrantyEndDate(project: ProjectWarrantyFields) {
  const endsAt = resolveProjectWarrantyEndsAt(project);
  if (!endsAt) {
    return "—";
  }
  return formatDate(endsAt);
}

export function hasPendingWarrantyExtension(agreements: ProjectClientAgreement[]) {
  return agreements.some(
    (entry) => entry.category === "warranty" && entry.status === "pending_client",
  );
}

export function filterWarrantyAgreements(agreements: ProjectClientAgreement[]) {
  return agreements.filter((entry) => entry.category === "warranty");
}

export const WARRANTY_DURATION_PRESETS = [
  { label: "12 mies.", months: 12 },
  { label: "24 mies.", months: 24 },
  { label: "36 mies.", months: 36 },
] as const;

export const WARRANTY_EXPIRY_NOTICE_DAYS_EXPORT = WARRANTY_EXPIRY_NOTICE_DAYS;
