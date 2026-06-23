import type { ProjectAgreementCategory, ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { AgreementAttachment } from "@/lib/dashboard/agreement-attachment-types";

export type AgreementCommentAuthorSource = "team" | "client" | "external";

export type AgreementApprovalStatus = "pending" | "accepted" | "rejected";

export const TEAM_APPROVER_ROLE_LABEL = "Administrator";

export type AgreementApproverRole = {
  id: string;
  agreementId: string;
  label: string;
  position: number;
  isRequired: boolean;
  isClientRole: boolean;
  isTeamRole: boolean;
  createdAt: string;
};

export type AgreementApproverRoleInput = {
  label: string;
  isRequired?: boolean;
  isClientRole?: boolean;
  isTeamRole?: boolean;
};

export function isTeamApproverRole(
  role: Pick<AgreementApproverRole, "isClientRole" | "isTeamRole" | "label">,
): boolean {
  return (
    role.isTeamRole === true ||
    (!role.isClientRole && role.label === TEAM_APPROVER_ROLE_LABEL)
  );
}

const APPROVAL_STATUS_SHORT_LABELS: Record<AgreementApprovalStatus, string> = {
  pending: "oczekuje",
  accepted: "zaakceptowano",
  rejected: "odrzucono",
};

export function buildAgreementApprovalProgressHint(
  roles: AgreementApproverRole[],
  approvals: AgreementApproval[],
): string | null {
  if (!roles.length) {
    return null;
  }

  const parts = roles.map((role) => {
    const approval = approvals.find((entry) => entry.roleId === role.id);
    const status = approval?.status ?? "pending";
    return `${role.label}: ${APPROVAL_STATUS_SHORT_LABELS[status]}`;
  });

  return parts.join(" · ");
}

export function isAgreementPendingTeamApproval(
  roles: AgreementApproverRole[],
  approvals: AgreementApproval[],
): boolean {
  return roles.some((role) => {
    if (!isTeamApproverRole(role) || !role.isRequired) {
      return false;
    }
    const approval = approvals.find((entry) => entry.roleId === role.id);
    return (approval?.status ?? "pending") === "pending";
  });
}

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
  attachments: AgreementAttachment[];
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
