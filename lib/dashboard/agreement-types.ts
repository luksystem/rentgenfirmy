export const PROJECT_AGREEMENT_CATEGORIES = [
  "integration",
  "specification",
  "change",
  "handover",
  "warranty",
  "other",
] as const;

export type ProjectAgreementCategory = (typeof PROJECT_AGREEMENT_CATEGORIES)[number];

export const PROJECT_AGREEMENT_STATUSES = [
  "draft",
  "pending_client",
  "accepted",
  "rejected",
  "cancelled",
] as const;

export type ProjectAgreementStatus = (typeof PROJECT_AGREEMENT_STATUSES)[number];

export type ProjectClientAgreement = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  category: ProjectAgreementCategory;
  status: ProjectAgreementStatus;
  proposedCostNet: number | null;
  proposedCostGross: number | null;
  proposedCostVatRate: number | null;
  costNote: string | null;
  createdByName: string;
  createdBySide: "team" | "client";
  submittedAt: string | null;
  clientRespondedAt: string | null;
  clientResponseName: string | null;
  clientResponseNote: string | null;
  proposedWarrantyEndDate: string | null;
  position: number;
  publicToken: string;
  publicEnabled: boolean;
  discussionOpen: boolean;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAgreementInput = {
  title: string;
  body: string;
  category: ProjectAgreementCategory;
  proposedCostNet?: number | null;
  proposedCostGross?: number | null;
  proposedCostVatRate?: number | null;
  costNote?: string | null;
  proposedWarrantyEndDate?: string | null;
  publicEnabled?: boolean;
  approverRoles?: import("@/lib/dashboard/agreement-collaboration-types").AgreementApproverRoleInput[];
};

export function normalizeAgreementOptionalDate(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProjectAgreementInput(input: ProjectAgreementInput): ProjectAgreementInput {
  return {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
    costNote: input.costNote?.trim() || undefined,
    proposedWarrantyEndDate: normalizeAgreementOptionalDate(input.proposedWarrantyEndDate),
  };
}

export const PROJECT_AGREEMENT_CATEGORY_LABELS: Record<ProjectAgreementCategory, string> = {
  integration: "Integracja",
  specification: "Specyfikacja / urządzenia",
  change: "Zmiana / element dodatkowy",
  handover: "Przekazanie / odbiór",
  warranty: "Przedłużenie gwarancji",
  other: "Inne",
};

export const PROJECT_AGREEMENT_STATUS_LABELS: Record<ProjectAgreementStatus, string> = {
  draft: "Szkic",
  pending_client: "Oczekuje na klienta",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
  cancelled: "Anulowane",
};

export function agreementStatusTone(
  status: ProjectAgreementStatus,
): "neutral" | "warning" | "success" | "danger" {
  switch (status) {
    case "pending_client":
      return "warning";
    case "accepted":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

/** Ustalenie wymaga uwagi na dashboardzie (akceptacja lub otwarta dyskusja). */
export function isAgreementPendingAttention(
  agreement: Pick<ProjectClientAgreement, "status" | "discussionOpen">,
): boolean {
  if (agreement.status === "accepted" || agreement.status === "cancelled") {
    return false;
  }
  if (agreement.status === "pending_client") {
    return true;
  }
  return agreement.discussionOpen;
}

export function getAgreementStatusLabel(
  agreement: Pick<ProjectClientAgreement, "status" | "discussionOpen">,
): string {
  if (
    agreement.discussionOpen &&
    agreement.status !== "pending_client" &&
    agreement.status !== "accepted" &&
    agreement.status !== "cancelled"
  ) {
    return "Otwarta dyskusja";
  }
  return PROJECT_AGREEMENT_STATUS_LABELS[agreement.status];
}

export function getAgreementStatusTone(
  agreement: Pick<ProjectClientAgreement, "status" | "discussionOpen">,
): "neutral" | "warning" | "success" | "danger" {
  if (isAgreementPendingAttention(agreement)) {
    return "warning";
  }
  return agreementStatusTone(agreement.status);
}

function formatCostAmount(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatAgreementCost(agreement: Pick<
  ProjectClientAgreement,
  "proposedCostNet" | "proposedCostGross" | "proposedCostVatRate" | "costNote"
>) {
  const parts: string[] = [];
  const net = formatCostAmount(agreement.proposedCostNet);
  const gross = formatCostAmount(agreement.proposedCostGross);
  const vatRate = agreement.proposedCostVatRate;

  if (net != null) {
    parts.push(`netto ${net.toFixed(2)} PLN`);
  }
  if (vatRate === 0 || vatRate === 8 || vatRate === 23) {
    parts.push(`VAT ${vatRate}%`);
  }
  if (gross != null) {
    parts.push(`brutto ${gross.toFixed(2)} PLN`);
  }
  if (!parts.length) {
    return agreement.costNote?.trim() || null;
  }
  return parts.join(" · ");
}
