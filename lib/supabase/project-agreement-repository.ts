import type {
  ProjectAgreementInput,
  ProjectAgreementStatus,
  ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { normalizeProjectAgreementInput } from "@/lib/dashboard/agreement-types";
import {
  createDefaultClientRole,
  publishAgreementVersion,
  respondToAgreementApproval,
  rowToAgreement,
  saveAgreementCollaborationSettings,
  fetchAgreementApproverRoles,
} from "@/lib/supabase/project-agreement-collaboration-repository";
import { getSupabase } from "@/lib/supabase/client";
import { fetchProjectAccessibleProfiles } from "@/lib/supabase/project-access-repository";

type AgreementRow = Parameters<typeof rowToAgreement>[0];

async function assertResponsibleUserHasProjectAccess(
  projectId: string,
  responsibleUserId: string | null | undefined,
  options?: { required?: boolean },
) {
  if (!responsibleUserId) {
    if (options?.required) {
      throw new Error("Wybierz osobę odpowiedzialną.");
    }
    return;
  }
  const profiles = await fetchProjectAccessibleProfiles(projectId);
  if (!profiles.some((profile) => profile.id === responsibleUserId)) {
    throw new Error("Osoba odpowiedzialna musi mieć dostęp do tego projektu.");
  }
}

export async function fetchProjectAgreements(projectId: string): Promise<ProjectClientAgreement[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToAgreement(row as AgreementRow));
}

export async function createProjectAgreement(
  projectId: string,
  input: ProjectAgreementInput,
  author: { name: string; side: "team" | "client" },
) {
  const normalized = normalizeProjectAgreementInput(input);
  await assertResponsibleUserHasProjectAccess(projectId, normalized.responsibleUserId, {
    required: author.side === "team",
  });
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data: lastRow } = await supabase
    .from("project_client_agreements")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_client_agreements")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      title: normalized.title,
      body: normalized.body,
      category: normalized.category,
      status: "draft",
      proposed_cost_net: normalized.proposedCostNet ?? null,
      proposed_cost_gross: normalized.proposedCostGross ?? null,
      proposed_cost_vat_rate: normalized.proposedCostVatRate ?? null,
      cost_note: normalized.costNote?.trim() || null,
      proposed_warranty_end_date: normalized.proposedWarrantyEndDate,
      communication_protocols: normalized.communicationProtocols ?? [],
      acceptance_deadline_stage_id: normalized.acceptanceDeadlineStageId ?? null,
      blocks_next_stage: normalized.blocksNextStage ?? false,
      responsible_user_id: normalized.responsibleUserId ?? null,
      created_by_name: author.name.trim() || "Zespół",
      created_by_side: author.side,
      position,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const agreement = rowToAgreement(data as AgreementRow);
  await createDefaultClientRole(agreement.id);
  if (normalized.publicEnabled !== undefined || normalized.approverRoles) {
    await saveAgreementCollaborationSettings(agreement.id, {
      publicEnabled: normalized.publicEnabled,
      approverRoles: normalized.approverRoles,
    });
  }

  const { data: refreshed } = await supabase
    .from("project_client_agreements")
    .select("*")
    .eq("id", agreement.id)
    .single();

  return rowToAgreement(refreshed as AgreementRow);
}

export async function updateProjectAgreementDraft(
  agreementId: string,
  input: ProjectAgreementInput,
) {
  return updateProjectAgreement(agreementId, input, ["draft"]);
}

export async function updateProjectAgreement(
  agreementId: string,
  input: ProjectAgreementInput,
  allowedStatuses: ProjectAgreementStatus[] = ["draft", "pending_client", "rejected"],
) {
  const normalized = normalizeProjectAgreementInput(input);
  const supabase = getSupabase();
  const { data: existingRow } = await supabase
    .from("project_client_agreements")
    .select("project_id")
    .eq("id", agreementId)
    .maybeSingle();
  if (existingRow?.project_id) {
    await assertResponsibleUserHasProjectAccess(
      existingRow.project_id as string,
      normalized.responsibleUserId,
      { required: true },
    );
  }
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      title: normalized.title,
      body: normalized.body,
      category: normalized.category,
      proposed_cost_net: normalized.proposedCostNet ?? null,
      proposed_cost_gross: normalized.proposedCostGross ?? null,
      proposed_cost_vat_rate: normalized.proposedCostVatRate ?? null,
      cost_note: normalized.costNote?.trim() || null,
      proposed_warranty_end_date: normalized.proposedWarrantyEndDate,
      communication_protocols: normalized.communicationProtocols ?? [],
      acceptance_deadline_stage_id: normalized.acceptanceDeadlineStageId ?? null,
      blocks_next_stage: normalized.blocksNextStage ?? false,
      responsible_user_id: normalized.responsibleUserId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId)
    .in("status", allowedStatuses)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const agreement = rowToAgreement(data as AgreementRow);
  if (normalized.publicEnabled !== undefined || normalized.approverRoles) {
    await saveAgreementCollaborationSettings(agreementId, {
      publicEnabled: normalized.publicEnabled,
      approverRoles: normalized.approverRoles,
    });
    const { data: refreshed } = await supabase
      .from("project_client_agreements")
      .select("*")
      .eq("id", agreementId)
      .single();
    return rowToAgreement(refreshed as AgreementRow);
  }

  return agreement;
}

export async function submitProjectAgreementForClient(
  agreementId: string,
  publishedByName = "Zespół",
) {
  const bundle = await publishAgreementVersion(agreementId, publishedByName);
  return bundle.agreement;
}

export async function respondToProjectAgreement(
  agreementId: string,
  input: {
    accepted: boolean;
    clientResponseName: string;
    clientResponseNote?: string;
  },
) {
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from("project_client_agreements")
    .select("active_version_id")
    .eq("id", agreementId)
    .maybeSingle();

  if (row?.active_version_id) {
    const roles = await fetchAgreementApproverRoles(agreementId);
    const clientRole = roles.find((role) => role.isClientRole) ?? roles[0];
    if (!clientRole) {
      throw new Error("Brak roli akceptacji dla klienta.");
    }
    const bundle = await respondToAgreementApproval(agreementId, clientRole.id, {
      accepted: input.accepted,
      respondedByName: input.clientResponseName,
      responseNote: input.clientResponseNote,
    });
    return bundle.agreement;
  }

  return respondToProjectAgreementLegacy(agreementId, input);
}

async function respondToProjectAgreementLegacy(
  agreementId: string,
  input: {
    accepted: boolean;
    clientResponseName: string;
    clientResponseNote?: string;
  },
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      status: input.accepted ? "accepted" : "rejected",
      client_responded_at: now,
      client_response_name: input.clientResponseName.trim() || "Klient",
      client_response_note: input.clientResponseNote?.trim() || null,
      updated_at: now,
    })
    .eq("id", agreementId)
    .eq("status", "pending_client")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const agreement = rowToAgreement(data as AgreementRow);

  if (
    input.accepted &&
    agreement.category === "warranty" &&
    agreement.proposedWarrantyEndDate
  ) {
    const { error: projectError } = await supabase
      .from("projects")
      .update({ warranty_ends_at: agreement.proposedWarrantyEndDate })
      .eq("id", agreement.projectId);

    if (projectError) {
      throw new Error(projectError.message);
    }
  }

  return agreement;
}

export async function cancelProjectAgreement(agreementId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId)
    .in("status", ["draft", "pending_client"])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreement(data as AgreementRow);
}

export async function deleteProjectAgreementDraft(agreementId: string) {
  return deleteProjectAgreement(agreementId, ["draft"]);
}

export async function deleteProjectAgreement(
  agreementId: string,
  allowedStatuses?: ProjectAgreementStatus[],
) {
  const supabase = getSupabase();
  let query = supabase.from("project_client_agreements").delete().eq("id", agreementId);

  if (allowedStatuses?.length) {
    query = query.in("status", allowedStatuses);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}
