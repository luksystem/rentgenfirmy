export const PROJECT_CHANGE_REQUEST_STATUSES = [
  "draft",
  "pending_client",
  "accepted",
  "rejected",
  "cancelled",
] as const;

export type ProjectChangeRequestStatus = (typeof PROJECT_CHANGE_REQUEST_STATUSES)[number];

export type ProjectChangeRequest = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  status: ProjectChangeRequestStatus;
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
  position: number;
  /** Id etapu procesu (w template_snapshot projektu), przed którym zmiana musi być zaakceptowana. */
  acceptanceDeadlineStageId: string | null;
  /** Jeśli true i zmiana nie jest zaakceptowana, blokuje wybrany etap i wszystkie po nim. */
  blocksNextStage: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectChangeRequestInput = {
  title: string;
  body: string;
  proposedCostNet?: number | null;
  proposedCostGross?: number | null;
  proposedCostVatRate?: number | null;
  costNote?: string | null;
  acceptanceDeadlineStageId?: string | null;
  blocksNextStage?: boolean;
};

export function normalizeProjectChangeRequestInput(
  input: ProjectChangeRequestInput,
): ProjectChangeRequestInput {
  return {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
    costNote: input.costNote?.trim() || undefined,
    acceptanceDeadlineStageId: input.acceptanceDeadlineStageId?.trim() || null,
    blocksNextStage: Boolean(input.blocksNextStage && input.acceptanceDeadlineStageId?.trim()),
  };
}

export const PROJECT_CHANGE_REQUEST_STATUS_LABELS: Record<ProjectChangeRequestStatus, string> = {
  draft: "Szkic",
  pending_client: "Oczekuje na klienta",
  accepted: "Zaakceptowana",
  rejected: "Odrzucona",
  cancelled: "Anulowana",
};

export function changeRequestStatusTone(
  status: ProjectChangeRequestStatus,
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

export type ChangeRequestStatusBadgeTone = ReturnType<typeof changeRequestStatusTone>;

/** Zmiana ma deadline akceptacji i blokuje etap procesu, dopóki nie jest zaakceptowana. */
export function isChangeRequestBlockingActive(
  changeRequest: Pick<ProjectChangeRequest, "blocksNextStage" | "acceptanceDeadlineStageId" | "status">,
): boolean {
  return Boolean(
    changeRequest.blocksNextStage &&
      changeRequest.acceptanceDeadlineStageId &&
      changeRequest.status !== "accepted",
  );
}

/** Zmiana wymaga uwagi na dashboardzie (oczekuje na decyzję klienta). */
export function isChangeRequestPendingAttention(
  changeRequest: Pick<ProjectChangeRequest, "status">,
): boolean {
  return changeRequest.status === "pending_client";
}

function formatCostAmount(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatChangeRequestCost(
  changeRequest: Pick<
    ProjectChangeRequest,
    "proposedCostNet" | "proposedCostGross" | "proposedCostVatRate" | "costNote"
  >,
) {
  const parts: string[] = [];
  const net = formatCostAmount(changeRequest.proposedCostNet);
  const gross = formatCostAmount(changeRequest.proposedCostGross);
  const vatRate = changeRequest.proposedCostVatRate;

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
    return changeRequest.costNote?.trim() || null;
  }
  return parts.join(" · ");
}

export function buildChangeRequestCollapsibleMeta(changeRequest: ProjectChangeRequest) {
  const costLabel = formatChangeRequestCost(changeRequest);
  return {
    title: changeRequest.title,
    subtitle: [changeRequest.createdByName, costLabel].filter(Boolean).join(" · "),
    statusLabel: PROJECT_CHANGE_REQUEST_STATUS_LABELS[changeRequest.status],
    statusTone: changeRequestStatusTone(changeRequest.status),
  };
}
