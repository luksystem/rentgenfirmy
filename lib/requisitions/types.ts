export const REQUISITION_CATEGORIES = ["clothing", "tools", "equipment", "other"] as const;
export type RequisitionCategory = (typeof REQUISITION_CATEGORIES)[number];

export const REQUISITION_CATEGORY_LABELS: Record<RequisitionCategory, string> = {
  clothing: "Ubrania",
  tools: "Narzędzia",
  equipment: "Sprzęt",
  other: "Inne",
};

export const REQUISITION_SCOPES = ["personal", "project", "general"] as const;
export type RequisitionScope = (typeof REQUISITION_SCOPES)[number];

export const REQUISITION_SCOPE_LABELS: Record<RequisitionScope, string> = {
  personal: "Osobiste (karta obiegowa)",
  project: "Projektowe",
  general: "Ogólne / techniczne",
};

export const REQUISITION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "ordered",
  "fulfilled",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  draft: "Szkic",
  submitted: "Zgłoszone",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
  ordered: "Zamówione",
  fulfilled: "Zrealizowane",
};

export type Requisition = {
  id: string;
  title: string;
  description: string;
  category: RequisitionCategory;
  scope: RequisitionScope;
  status: RequisitionStatus;
  projectId: string | null;
  clientId: string | null;
  requestedByName: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
};

export type RequisitionInput = {
  title: string;
  description?: string;
  category: RequisitionCategory;
  scope: RequisitionScope;
  projectId?: string | null;
  clientId?: string | null;
};

export function normalizeRequisitionInput(input: RequisitionInput): RequisitionInput {
  return {
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    projectId: input.projectId || null,
    clientId: input.clientId || null,
  };
}

export function canReviewRequisition(status: RequisitionStatus) {
  return status === "submitted";
}

export function canMarkOrdered(status: RequisitionStatus) {
  return status === "approved";
}

export function canMarkFulfilled(status: RequisitionStatus) {
  return status === "ordered";
}

export function requisitionStatusTone(status: RequisitionStatus) {
  switch (status) {
    case "submitted":
      return "warning" as const;
    case "approved":
    case "fulfilled":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    case "ordered":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}
