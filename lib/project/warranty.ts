import type { Project } from "@/lib/types";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import { formatDate } from "@/lib/utils";

export type WarrantyStatus = "none" | "active" | "expired" | "pending_extension";

export type WarrantyStatusInfo = {
  status: WarrantyStatus;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getProjectDurationDays(project: Pick<Project, "createdAt">, referenceDate = new Date()) {
  const created = startOfDay(new Date(project.createdAt));
  const today = startOfDay(referenceDate);
  const diffMs = today.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatProjectDuration(project: Pick<Project, "createdAt">) {
  const days = getProjectDurationDays(project);
  if (days === 0) {
    return "dzisiaj";
  }
  if (days === 1) {
    return "1 dzień";
  }
  return `${days} dni`;
}

export function getWarrantyStatus(
  project: Pick<Project, "warrantyEndsAt">,
  options?: { hasPendingExtension?: boolean },
): WarrantyStatusInfo {
  if (options?.hasPendingExtension) {
    return { status: "pending_extension", label: "Oczekuje przedłużenia", tone: "warning" };
  }

  if (!project.warrantyEndsAt) {
    return { status: "none", label: "Brak gwarancji", tone: "neutral" };
  }

  const endsAt = startOfDay(new Date(project.warrantyEndsAt));
  const today = startOfDay(new Date());

  if (endsAt >= today) {
    return { status: "active", label: "Aktywna", tone: "success" };
  }

  return { status: "expired", label: "Wygasła", tone: "danger" };
}

export function formatWarrantyEndDate(project: Pick<Project, "warrantyEndsAt">) {
  if (!project.warrantyEndsAt) {
    return "—";
  }
  return formatDate(project.warrantyEndsAt);
}

export function hasPendingWarrantyExtension(agreements: ProjectClientAgreement[]) {
  return agreements.some(
    (entry) => entry.category === "warranty" && entry.status === "pending_client",
  );
}

export function filterWarrantyAgreements(agreements: ProjectClientAgreement[]) {
  return agreements.filter((entry) => entry.category === "warranty");
}
