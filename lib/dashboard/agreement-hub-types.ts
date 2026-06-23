import type { ProjectAgreementStatus, ProjectClientAgreement } from "@/lib/dashboard/agreement-types";

export type AgreementHubEntry = {
  agreement: ProjectClientAgreement;
  projectId: string;
  projectName: string;
  clientId: string | null;
  clientName: string;
};

export type AgreementHubSnapshot = {
  entries: AgreementHubEntry[];
  countsByStatus: Record<ProjectAgreementStatus, number>;
};

export const AGREEMENT_KANBAN_COLUMNS = [
  { id: "draft", label: "Szkice", statuses: ["draft"] as const },
  { id: "pending", label: "Oczekujące", statuses: ["pending_client"] as const },
  { id: "accepted", label: "Zaakceptowane", statuses: ["accepted"] as const },
  { id: "rejected", label: "Odrzucone", statuses: ["rejected"] as const },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  statuses: readonly ProjectAgreementStatus[];
}>;

export type AgreementKanbanColumnId = (typeof AGREEMENT_KANBAN_COLUMNS)[number]["id"];

export function agreementKanbanColumnForStatus(
  status: ProjectAgreementStatus,
): AgreementKanbanColumnId | null {
  if (status === "cancelled") {
    return null;
  }
  const column = AGREEMENT_KANBAN_COLUMNS.find((entry) =>
    (entry.statuses as readonly ProjectAgreementStatus[]).includes(status),
  );
  return column?.id ?? null;
}

export function buildAgreementHubDashboardHref(entry: AgreementHubEntry) {
  if (!entry.clientId) {
    return null;
  }
  const params = new URLSearchParams({
    project: entry.projectId,
    tab: "agreements",
    agreement: entry.agreement.id,
  });
  return `/przestrzenie/klient/${entry.clientId}?${params.toString()}`;
}
