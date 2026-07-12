import type {
  AgreementApproval,
  AgreementApproverRole,
  AgreementApproverRoleInput,
  AgreementComment,
  AgreementCommentAuthorSource,
  AgreementVersion,
} from "@/lib/dashboard/agreement-collaboration-types";
import {
  TEAM_APPROVER_ROLE_LABEL,
  buildAgreementApprovalProgressHint,
  isTeamApproverRole,
} from "@/lib/dashboard/agreement-collaboration-types";
import type {
  ProjectAgreementCategory,
  ProjectAgreementInput,
  ProjectAgreementStatus,
  ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { normalizeAgreementOptionalDate } from "@/lib/dashboard/agreement-types";
import { getSupabase } from "@/lib/supabase/client";
import { fetchAgreementAttachments } from "@/lib/supabase/project-agreement-attachments-repository";
import { invalidateAgreementHubCache } from "@/lib/supabase/agreement-hub-repository";

type AgreementRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  proposed_warranty_end_date: string | null;
  position: number;
  public_token: string;
  public_enabled: boolean;
  discussion_open: boolean;
  active_version_id: string | null;
  communication_protocols?: string[] | null;
  acceptance_deadline_stage_id?: string | null;
  blocks_next_stage?: boolean | null;
  responsible_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

function parseNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isCategory(value: string): value is ProjectAgreementCategory {
  return ["integration", "specification", "change", "handover", "warranty", "other"].includes(value);
}

function isStatus(value: string): value is ProjectAgreementStatus {
  return ["draft", "pending_client", "accepted", "rejected", "cancelled"].includes(value);
}

export function rowToAgreement(row: AgreementRow): ProjectClientAgreement {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    category: isCategory(row.category) ? row.category : "other",
    status: isStatus(row.status) ? row.status : "draft",
    proposedCostNet: parseNumber(row.proposed_cost_net),
    proposedCostGross: parseNumber(row.proposed_cost_gross),
    proposedCostVatRate: parseNumber(row.proposed_cost_vat_rate),
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    proposedWarrantyEndDate: row.proposed_warranty_end_date,
    position: row.position,
    publicToken: row.public_token ?? "",
    publicEnabled: row.public_enabled ?? false,
    discussionOpen: row.discussion_open ?? false,
    activeVersionId: row.active_version_id ?? null,
    communicationProtocols: Array.isArray(row.communication_protocols)
      ? row.communication_protocols.filter(Boolean)
      : [],
    acceptanceDeadlineStageId: row.acceptance_deadline_stage_id ?? null,
    blocksNextStage: Boolean(row.blocks_next_stage),
    responsibleUserId: row.responsible_user_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRole(row: {
  id: string;
  agreement_id: string;
  label: string;
  position: number;
  is_required: boolean;
  is_client_role: boolean;
  is_team_role?: boolean;
  created_at: string;
}): AgreementApproverRole {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    label: row.label,
    position: row.position,
    isRequired: row.is_required,
    isClientRole: row.is_client_role,
    isTeamRole: row.is_team_role ?? isTeamApproverRole({
      label: row.label,
      isClientRole: row.is_client_role,
      isTeamRole: row.is_team_role ?? false,
    }),
    createdAt: row.created_at,
  };
}

function rowToComment(row: {
  id: string;
  agreement_id: string;
  author_name: string;
  author_source: string;
  author_role_label: string | null;
  body: string;
  created_at: string;
}): AgreementComment {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    authorName: row.author_name,
    authorSource: row.author_source as AgreementCommentAuthorSource,
    authorRoleLabel: row.author_role_label,
    body: row.body,
    createdAt: row.created_at,
  };
}

function rowToVersion(row: {
  id: string;
  agreement_id: string;
  version_number: number;
  title: string;
  body: string;
  category: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  proposed_cost_vat_rate: number | null;
  cost_note: string | null;
  proposed_warranty_end_date: string | null;
  published_by_name: string;
  published_at: string;
}): AgreementVersion {
  return {
    id: row.id,
    agreementId: row.agreement_id,
    versionNumber: row.version_number,
    title: row.title,
    body: row.body,
    category: isCategory(row.category) ? row.category : "other",
    proposedCostNet: parseNumber(row.proposed_cost_net),
    proposedCostGross: parseNumber(row.proposed_cost_gross),
    proposedCostVatRate: parseNumber(row.proposed_cost_vat_rate),
    costNote: row.cost_note,
    proposedWarrantyEndDate: row.proposed_warranty_end_date,
    publishedByName: row.published_by_name,
    publishedAt: row.published_at,
  };
}

function rowToApproval(row: {
  id: string;
  version_id: string;
  role_id: string;
  status: string;
  responded_by_name: string | null;
  response_note: string | null;
  responded_at: string | null;
}): AgreementApproval {
  return {
    id: row.id,
    versionId: row.version_id,
    roleId: row.role_id,
    status: row.status as AgreementApproval["status"],
    respondedByName: row.responded_by_name,
    responseNote: row.response_note,
    respondedAt: row.responded_at,
  };
}

function normalizeRolesInput(roles: AgreementApproverRoleInput[] | undefined) {
  const source =
    roles?.length ?
      roles
    : [
        { label: TEAM_APPROVER_ROLE_LABEL, isRequired: true, isTeamRole: true },
        { label: "Klient", isRequired: true, isClientRole: true },
      ];

  const normalized = source
    .map((role, index) => ({
      label: role.label.trim(),
      position: index,
      is_required: role.isRequired ?? true,
      is_client_role: role.isClientRole ?? false,
      is_team_role:
        role.isTeamRole ??
        (!role.isClientRole && role.label.trim() === TEAM_APPROVER_ROLE_LABEL),
    }))
    .filter((role) => role.label.length > 0);

  if (!normalized.some((role) => role.is_team_role)) {
    normalized.unshift({
      label: TEAM_APPROVER_ROLE_LABEL,
      position: 0,
      is_required: true,
      is_client_role: false,
      is_team_role: true,
    });
  }

  if (!normalized.some((role) => role.is_client_role)) {
    normalized.push({
      label: "Klient",
      position: normalized.length,
      is_required: true,
      is_client_role: true,
      is_team_role: false,
    });
  }

  return normalized
    .sort((left, right) => {
      if (left.is_team_role !== right.is_team_role) {
        return left.is_team_role ? -1 : 1;
      }
      if (left.is_client_role !== right.is_client_role) {
        return left.is_client_role ? 1 : -1;
      }
      return left.position - right.position;
    })
    .map((role, index) => ({ ...role, position: index }));
}

async function replaceApproverRoles(agreementId: string, roles: AgreementApproverRoleInput[] | undefined) {
  const supabase = getSupabase();
  const normalized = normalizeRolesInput(roles);

  const { error: deleteError } = await supabase
    .from("project_agreement_approver_roles")
    .delete()
    .eq("agreement_id", agreementId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: insertError } = await supabase.from("project_agreement_approver_roles").insert(
    normalized.map((role) => ({
      agreement_id: agreementId,
      label: role.label,
      position: role.position,
      is_required: role.is_required,
      is_client_role: role.is_client_role,
      is_team_role: role.is_team_role,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function createDefaultApproverRoles(agreementId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("project_agreement_approver_roles").insert([
    {
      agreement_id: agreementId,
      label: TEAM_APPROVER_ROLE_LABEL,
      position: 0,
      is_required: true,
      is_client_role: false,
      is_team_role: true,
    },
    {
      agreement_id: agreementId,
      label: "Klient",
      position: 1,
      is_required: true,
      is_client_role: true,
      is_team_role: false,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }
}

/** @deprecated Użyj createDefaultApproverRoles */
async function createDefaultClientRole(agreementId: string) {
  await createDefaultApproverRoles(agreementId);
}

export async function fetchAgreementApproverRoles(agreementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_agreement_approver_roles")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToRole(row));
}

export async function fetchAgreementComments(agreementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_agreement_comments")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToComment(row));
}

export async function fetchAgreementVersions(agreementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_agreement_versions")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToVersion(row));
}

export async function fetchAgreementApprovalsForVersion(versionId: string, roles: AgreementApproverRole[]) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_agreement_approvals")
    .select("*")
    .eq("version_id", versionId);

  if (error) {
    throw new Error(error.message);
  }

  const roleById = new Map(roles.map((role) => [role.id, role]));
  return (data ?? []).map((row) => ({
    ...rowToApproval(row),
    role: roleById.get(row.role_id),
  }));
}

export async function fetchAgreementCollaboration(agreementId: string) {
  const supabase = getSupabase();
  const { data: agreementRow, error: agreementError } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError) {
    throw new Error(agreementError.message);
  }
  if (!agreementRow) {
    throw new Error("Nie znaleziono ustalenia.");
  }

  const agreement = rowToAgreement(agreementRow as AgreementRow);
  const [roles, comments, versions, attachments] = await Promise.all([
    fetchAgreementApproverRoles(agreementId),
    fetchAgreementComments(agreementId),
    fetchAgreementVersions(agreementId),
    fetchAgreementAttachments(agreementId).catch(() => []),
  ]);

  const activeVersion =
    versions.find((version) => version.id === agreement.activeVersionId) ??
    versions[0] ??
    null;

  const approvals =
    activeVersion ?
      await fetchAgreementApprovalsForVersion(activeVersion.id, roles)
    : [];

  return { agreement, roles, comments, attachments, activeVersion, approvals, versions };
}

export async function fetchAgreementCollaborationByToken(token: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("public_token", token)
    .eq("public_enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  return fetchAgreementCollaboration((data as AgreementRow).id);
}

export async function setAgreementPublicEnabled(agreementId: string, enabled: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({ public_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", agreementId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreement(data as AgreementRow);
}

export async function setAgreementDiscussionOpen(agreementId: string, open: boolean) {
  const supabase = getSupabase();

  if (open) {
    const { data: existing, error: fetchError } = await supabase
      .from("project_client_agreements")
      .select("status")
      .eq("id", agreementId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }
    if (!existing) {
      throw new Error("Nie znaleziono ustalenia.");
    }
    if (existing.status === "cancelled") {
      throw new Error("Anulowanego ustalenia nie można otworzyć ponownie do dyskusji.");
    }
  }

  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      discussion_open: open,
      updated_at: new Date().toISOString(),
      ...(open
        ? {
            status: "draft" as const,
            active_version_id: null,
            submitted_at: null,
            client_responded_at: null,
            client_response_name: null,
            client_response_note: null,
          }
        : {}),
    })
    .eq("id", agreementId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreement(data as AgreementRow);
}

export async function addAgreementComment(
  agreementId: string,
  input: {
    authorName: string;
    authorSource: AgreementCommentAuthorSource;
    authorRoleLabel?: string | null;
    body: string;
  },
) {
  const supabase = getSupabase();
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error("Komentarz nie może być pusty.");
  }

  const { data, error } = await supabase
    .from("project_agreement_comments")
    .insert({
      agreement_id: agreementId,
      author_name: input.authorName.trim() || "Użytkownik",
      author_source: input.authorSource,
      author_role_label: input.authorRoleLabel?.trim() || null,
      body: trimmed,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await touchAgreementActivity(agreementId, supabase);

  return rowToComment(data);
}

export async function touchAgreementActivity(
  agreementId: string,
  supabase = getSupabase(),
) {
  const { error } = await supabase
    .from("project_client_agreements")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", agreementId);

  if (error) {
    throw new Error(error.message);
  }
}

async function applyWarrantyIfAccepted(agreement: ProjectClientAgreement) {
  if (agreement.category !== "warranty" || !agreement.proposedWarrantyEndDate) {
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("projects")
    .update({ warranty_ends_at: agreement.proposedWarrantyEndDate })
    .eq("id", agreement.projectId);

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureVersionApprovalRows(
  versionId: string,
  roles: AgreementApproverRole[],
  supabase = getSupabase(),
) {
  const requiredRoles = roles.filter((role) => role.isRequired);
  if (!requiredRoles.length) {
    return;
  }

  const { data: existing, error: fetchError } = await supabase
    .from("project_agreement_approvals")
    .select("role_id")
    .eq("version_id", versionId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingRoleIds = new Set((existing ?? []).map((row) => row.role_id as string));
  const missingRoles = requiredRoles.filter((role) => !existingRoleIds.has(role.id));

  if (!missingRoles.length) {
    return;
  }

  const { error: insertError } = await supabase.from("project_agreement_approvals").insert(
    missingRoles.map((role) => ({
      version_id: versionId,
      role_id: role.id,
      status: "pending",
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}

function getRequiredRoleApprovalStatuses(
  roles: AgreementApproverRole[],
  approvals: AgreementApproval[],
) {
  const approvalByRoleId = new Map(approvals.map((entry) => [entry.roleId, entry.status]));
  return roles
    .filter((role) => role.isRequired)
    .map((role) => ({
      role,
      status: approvalByRoleId.get(role.id) ?? ("pending" as AgreementApproval["status"]),
    }));
}

async function finalizeAgreementApprovals(agreementId: string) {
  const supabase = getSupabase();
  const bundle = await fetchAgreementCollaboration(agreementId);
  const versionId = bundle.activeVersion?.id;

  if (!versionId || bundle.agreement.status !== "pending_client") {
    return bundle.agreement;
  }

  await ensureVersionApprovalRows(versionId, bundle.roles, supabase);
  const refreshedBundle = await fetchAgreementCollaboration(agreementId);
  const requiredStatuses = getRequiredRoleApprovalStatuses(
    refreshedBundle.roles,
    refreshedBundle.approvals,
  );

  if (!requiredStatuses.length) {
    return refreshedBundle.agreement;
  }

  if (requiredStatuses.some((entry) => entry.status === "rejected")) {
    const { data, error } = await supabase
      .from("project_client_agreements")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreementId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return rowToAgreement(data as AgreementRow);
  }

  if (requiredStatuses.every((entry) => entry.status === "accepted")) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("project_client_agreements")
      .update({
        status: "accepted",
        client_responded_at: now,
        updated_at: now,
      })
      .eq("id", agreementId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const agreement = rowToAgreement(data as AgreementRow);
    await applyWarrantyIfAccepted(agreement);
    return agreement;
  }

  return refreshedBundle.agreement;
}

export async function publishAgreementVersion(agreementId: string, publishedByName: string) {
  const supabase = getSupabase();
  const bundle = await fetchAgreementCollaboration(agreementId);
  const { agreement, roles } = bundle;

  if (!["draft", "rejected"].includes(agreement.status)) {
    throw new Error("To ustalenie nie może być teraz opublikowane do akceptacji.");
  }

  if (!roles.length) {
    await createDefaultApproverRoles(agreementId);
  }

  const refreshedRoles = roles.length ? roles : await fetchAgreementApproverRoles(agreementId);
  const nextVersionNumber = (bundle.versions[0]?.versionNumber ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: versionError } = await supabase.from("project_agreement_versions").insert({
    id: versionId,
    agreement_id: agreementId,
    version_number: nextVersionNumber,
    title: agreement.title,
    body: agreement.body,
    category: agreement.category,
    proposed_cost_net: agreement.proposedCostNet,
    proposed_cost_gross: agreement.proposedCostGross,
    proposed_cost_vat_rate: agreement.proposedCostVatRate,
    cost_note: agreement.costNote,
    proposed_warranty_end_date: normalizeAgreementOptionalDate(agreement.proposedWarrantyEndDate),
    published_by_name: publishedByName.trim() || "Zespół",
    published_at: now,
  });

  if (versionError) {
    throw new Error(versionError.message);
  }

  const approvalRows = refreshedRoles
    .filter((role) => role.isRequired)
    .map((role) => ({
      version_id: versionId,
      role_id: role.id,
      status: "pending",
    }));

  if (approvalRows.length) {
    const { error: approvalsError } = await supabase
      .from("project_agreement_approvals")
      .insert(approvalRows);

    if (approvalsError) {
      throw new Error(approvalsError.message);
    }
  }

  await ensureVersionApprovalRows(versionId, refreshedRoles, supabase);

  const { error } = await supabase
    .from("project_client_agreements")
    .update({
      status: "pending_client",
      discussion_open: false,
      active_version_id: versionId,
      submitted_at: now,
      updated_at: now,
      client_responded_at: null,
      client_response_name: null,
      client_response_note: null,
    })
    .eq("id", agreementId);

  if (error) {
    throw new Error(error.message);
  }

  await setAgreementPublicEnabled(agreementId, true);

  return fetchAgreementCollaboration(agreementId);
}

export async function respondToAgreementApproval(
  agreementId: string,
  roleId: string,
  input: {
    accepted: boolean;
    respondedByName: string;
    responseNote?: string;
  },
) {
  const supabase = getSupabase();
  const bundle = await fetchAgreementCollaboration(agreementId);
  const versionId = bundle.activeVersion?.id;

  if (!versionId || bundle.agreement.status !== "pending_client") {
    throw new Error("Brak aktywnej wersji do akceptacji.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("project_agreement_approvals")
    .update({
      status: input.accepted ? "accepted" : "rejected",
      responded_by_name: input.respondedByName.trim() || "Użytkownik",
      response_note: input.responseNote?.trim() || null,
      responded_at: now,
    })
    .eq("version_id", versionId)
    .eq("role_id", roleId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  const role = bundle.roles.find((entry) => entry.id === roleId);
  if (role?.isClientRole) {
    await supabase
      .from("project_client_agreements")
      .update({
        client_response_name: input.respondedByName.trim() || "Klient",
        client_response_note: input.responseNote?.trim() || null,
        updated_at: now,
      })
      .eq("id", agreementId);
  } else {
    await supabase
      .from("project_client_agreements")
      .update({ updated_at: now })
      .eq("id", agreementId);
  }

  await finalizeAgreementApprovals(agreementId);
  invalidateAgreementHubCache();
  return fetchAgreementCollaboration(agreementId);
}

export async function saveAgreementCollaborationSettings(
  agreementId: string,
  input: Pick<ProjectAgreementInput, "publicEnabled" | "approverRoles">,
) {
  if (input.publicEnabled !== undefined) {
    await setAgreementPublicEnabled(agreementId, input.publicEnabled);
  }
  if (input.approverRoles) {
    await replaceApproverRoles(agreementId, input.approverRoles);
  }
}

export async function fetchAgreementApprovalProgressHint(agreementId: string) {
  const bundle = await fetchAgreementCollaboration(agreementId);
  if (bundle.agreement.status !== "pending_client" || !bundle.activeVersion) {
    return null;
  }
  return buildAgreementApprovalProgressHint(bundle.roles, bundle.approvals);
}

export { replaceApproverRoles, createDefaultApproverRoles, createDefaultClientRole };
