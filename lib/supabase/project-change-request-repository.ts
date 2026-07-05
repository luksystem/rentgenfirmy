import type {
  ProjectChangeRequest,
  ProjectChangeRequestInput,
  ProjectChangeRequestStatus,
} from "@/lib/dashboard/change-request-types";
import { normalizeProjectChangeRequestInput } from "@/lib/dashboard/change-request-types";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type ChangeRequestRow = Database["public"]["Tables"]["project_change_requests"]["Row"];

function rowToChangeRequest(row: ChangeRequestRow): ProjectChangeRequest {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    status: row.status as ProjectChangeRequestStatus,
    proposedCostNet: row.proposed_cost_net != null ? Number(row.proposed_cost_net) : null,
    proposedCostGross: row.proposed_cost_gross != null ? Number(row.proposed_cost_gross) : null,
    proposedCostVatRate: row.proposed_cost_vat_rate != null ? Number(row.proposed_cost_vat_rate) : null,
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    position: row.position,
    acceptanceDeadlineStageId: row.acceptance_deadline_stage_id,
    blocksNextStage: Boolean(row.blocks_next_stage),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProjectChangeRequests(projectId: string): Promise<ProjectChangeRequest[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_change_requests")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToChangeRequest(row as ChangeRequestRow));
}

export async function createProjectChangeRequest(
  projectId: string,
  input: ProjectChangeRequestInput,
  author: { name: string; side: "team" | "client" },
) {
  const normalized = normalizeProjectChangeRequestInput(input);
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data: lastRow } = await supabase
    .from("project_change_requests")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastRow as { position?: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_change_requests")
    .insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      title: normalized.title,
      body: normalized.body,
      status: "draft",
      proposed_cost_net: normalized.proposedCostNet ?? null,
      proposed_cost_gross: normalized.proposedCostGross ?? null,
      proposed_cost_vat_rate: normalized.proposedCostVatRate ?? null,
      cost_note: normalized.costNote?.trim() || null,
      acceptance_deadline_stage_id: normalized.acceptanceDeadlineStageId ?? null,
      blocks_next_stage: normalized.blocksNextStage ?? false,
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

  return rowToChangeRequest(data as ChangeRequestRow);
}

export async function updateProjectChangeRequestDraft(
  changeRequestId: string,
  input: ProjectChangeRequestInput,
) {
  return updateProjectChangeRequest(changeRequestId, input, ["draft"]);
}

export async function updateProjectChangeRequest(
  changeRequestId: string,
  input: ProjectChangeRequestInput,
  allowedStatuses: ProjectChangeRequestStatus[] = ["draft", "pending_client", "rejected"],
) {
  const normalized = normalizeProjectChangeRequestInput(input);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      title: normalized.title,
      body: normalized.body,
      proposed_cost_net: normalized.proposedCostNet ?? null,
      proposed_cost_gross: normalized.proposedCostGross ?? null,
      proposed_cost_vat_rate: normalized.proposedCostVatRate ?? null,
      cost_note: normalized.costNote?.trim() || null,
      acceptance_deadline_stage_id: normalized.acceptanceDeadlineStageId ?? null,
      blocks_next_stage: normalized.blocksNextStage ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeRequestId)
    .in("status", allowedStatuses)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}

export async function submitProjectChangeRequestForClient(changeRequestId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      status: "pending_client",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeRequestId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}

export async function respondToProjectChangeRequest(
  changeRequestId: string,
  input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      status: input.accepted ? "accepted" : "rejected",
      client_responded_at: now,
      client_response_name: input.clientResponseName.trim() || "Klient",
      client_response_note: input.clientResponseNote?.trim() || null,
      updated_at: now,
    })
    .eq("id", changeRequestId)
    .eq("status", "pending_client")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}

export async function cancelProjectChangeRequest(changeRequestId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeRequestId)
    .in("status", ["draft", "pending_client"])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}

export async function deleteProjectChangeRequestDraft(changeRequestId: string) {
  return deleteProjectChangeRequest(changeRequestId, ["draft"]);
}

export async function deleteProjectChangeRequest(
  changeRequestId: string,
  allowedStatuses?: ProjectChangeRequestStatus[],
) {
  const supabase = getSupabase();
  let query = supabase.from("project_change_requests").delete().eq("id", changeRequestId);

  if (allowedStatuses?.length) {
    query = query.in("status", allowedStatuses);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}
