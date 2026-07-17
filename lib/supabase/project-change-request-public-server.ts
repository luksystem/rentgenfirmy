import { formatPartyName } from "@/lib/party/display-name";
import type { ProjectChangeRequest, ProjectChangeRequestStatus } from "@/lib/dashboard/change-request-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { PublicChangeRequestBundle } from "@/lib/supabase/project-change-request-repository";

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
    publicToken: row.public_token ?? null,
    publicEnabled: Boolean(row.public_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Pobiera zmianę po tokenie publicznym.
 * - pending + wyłączony link → null (link wygasł / nieaktywny)
 * - accepted/rejected → zwraca wynik (read-only), nawet gdy link wyłączony
 */
export async function fetchChangeRequestByPublicToken(
  token: string,
): Promise<PublicChangeRequestBundle | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_change_requests")
    .select("*")
    .eq("public_token", trimmed)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const changeRequest = rowToChangeRequest(data as ChangeRequestRow);
  const linkActive = changeRequest.publicEnabled && changeRequest.status === "pending_client";

  if (!linkActive && changeRequest.status === "pending_client") {
    return null;
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("name, client_id")
    .eq("id", changeRequest.projectId)
    .maybeSingle();

  let clientName: string | null = null;
  const clientId = (projectRow?.client_id as string | null) ?? null;
  if (clientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", clientId)
      .maybeSingle();
    if (clientRow) {
      clientName = formatPartyName({
        firstName: (clientRow.first_name as string | null) ?? "",
        lastName: (clientRow.last_name as string | null) ?? "",
      });
    }
  }

  return {
    changeRequest,
    projectName: (projectRow?.name as string | undefined) ?? "Projekt",
    clientName,
    linkActive,
  };
}

export async function respondToChangeRequestByPublicToken(
  token: string,
  input: { accepted: boolean; clientResponseName: string; clientResponseNote?: string },
) {
  const bundle = await fetchChangeRequestByPublicToken(token);
  if (!bundle || !bundle.linkActive) {
    throw new Error("Link jest nieaktywny lub decyzja została już podjęta.");
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      status: input.accepted ? "accepted" : "rejected",
      client_responded_at: now,
      client_response_name: input.clientResponseName.trim() || "Klient",
      client_response_note: input.clientResponseNote?.trim() || null,
      public_enabled: false,
      updated_at: now,
    })
    .eq("id", bundle.changeRequest.id)
    .eq("status", "pending_client")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}
