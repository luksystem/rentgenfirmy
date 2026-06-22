import type { ProjectAgreementCategory, ProjectClientAgreement } from "@/lib/dashboard/agreement-types";

export type AgreementCommentAuthorSource = "team" | "client" | "external";

export type AgreementApprovalStatus = "pending" | "accepted" | "rejected";

export type AgreementApproverRole = {
  id: string;
  agreementId: string;
  label: string;
  position: number;
  isRequired: boolean;
  isClientRole: boolean;
  createdAt: string;
};

export type AgreementApproverRoleInput = {
  label: string;
  isRequired?: boolean;
  isClientRole?: boolean;
};

export type AgreementComment = {
  id: string;
  agreementId: string;
  authorName: string;
  authorSource: AgreementCommentAuthorSource;
  authorRoleLabel: string | null;
  body: string;
  createdAt: string;
};

export type AgreementVersion = {
  id: string;
  agreementId: string;
  versionNumber: number;
  title: string;
  body: string;
  category: ProjectAgreementCategory;
  proposedCostNet: number | null;
  proposedCostGross: number | null;
  proposedCostVatRate: number | null;
  costNote: string | null;
  proposedWarrantyEndDate: string | null;
  publishedByName: string;
  publishedAt: string;
};

export type AgreementApproval = {
  id: string;
  versionId: string;
  roleId: string;
  status: AgreementApprovalStatus;
  respondedByName: string | null;
  responseNote: string | null;
  respondedAt: string | null;
  role?: AgreementApproverRole;
};

export type AgreementCollaborationBundle = {
  agreement: ProjectClientAgreement;
  roles: AgreementApproverRole[];
  comments: AgreementComment[];
  activeVersion: AgreementVersion | null;
  approvals: AgreementApproval[];
  versions: AgreementVersion[];
};

export type AgreementWorkflowPhase =
  | "draft"
  | "discussion"
  | "awaiting_approvals"
  | "accepted"
  | "rejected"
  | "cancelled";

export function getAgreementWorkflowPhase(
  agreement: Pick<ProjectClientAgreement, "status" | "discussionOpen">,
): AgreementWorkflowPhase {
  if (agreement.status === "accepted") return "accepted";
  if (agreement.status === "rejected") return "rejected";
  if (agreement.status === "cancelled") return "cancelled";
  if (agreement.status === "pending_client") return "awaiting_approvals";
  if (agreement.discussionOpen) return "discussion";
  return "draft";
}

export const AGREEMENT_WORKFLOW_PHASE_LABELS: Record<AgreementWorkflowPhase, string> = {
  draft: "Szkic",
  discussion: "Dyskusja",
  awaiting_approvals: "Oczekuje na akceptacje",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
  cancelled: "Anulowane",
};

export function getAgreementPublicPath(token: string) {
  return `/ustalenie/${token}`;
}

export function getAgreementPublicUrl(token: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${getAgreementPublicPath(token)}`;
  }
  return getAgreementPublicPath(token);
}
