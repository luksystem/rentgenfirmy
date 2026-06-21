import type {
  ProjectAgreementCategory,
  ProjectAgreementInput,
  ProjectAgreementStatus,
  ProjectClientAgreement,
} from "@/lib/dashboard/agreement-types";
import { getSupabase } from "@/lib/supabase/client";

type AgreementRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  proposed_cost_net: number | string | null;
  proposed_cost_gross: number | string | null;
  cost_note: string | null;
  created_by_name: string;
  created_by_side: string;
  submitted_at: string | null;
  client_responded_at: string | null;
  client_response_name: string | null;
  client_response_note: string | null;
  position: number;
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
  return ["integration", "specification", "change", "handover", "other"].includes(value);
}

function isStatus(value: string): value is ProjectAgreementStatus {
  return ["draft", "pending_client", "accepted", "rejected", "cancelled"].includes(value);
}

function rowToAgreement(row: AgreementRow): ProjectClientAgreement {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    category: isCategory(row.category) ? row.category : "other",
    status: isStatus(row.status) ? row.status : "draft",
    proposedCostNet: parseNumber(row.proposed_cost_net),
    proposedCostGross: parseNumber(row.proposed_cost_gross),
    costNote: row.cost_note,
    createdByName: row.created_by_name,
    createdBySide: row.created_by_side === "client" ? "client" : "team",
    submittedAt: row.submitted_at,
    clientRespondedAt: row.client_responded_at,
    clientResponseName: row.client_response_name,
    clientResponseNote: row.client_response_note,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      status: "draft",
      proposed_cost_net: input.proposedCostNet ?? null,
      proposed_cost_gross: input.proposedCostGross ?? null,
      cost_note: input.costNote?.trim() || null,
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

  return rowToAgreement(data as AgreementRow);
}

export async function updateProjectAgreementDraft(
  agreementId: string,
  input: ProjectAgreementInput,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      proposed_cost_net: input.proposedCostNet ?? null,
      proposed_cost_gross: input.proposedCostGross ?? null,
      cost_note: input.costNote?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreement(data as AgreementRow);
}

export async function submitProjectAgreementForClient(agreementId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_client_agreements")
    .update({
      status: "pending_client",
      submitted_at: now,
      updated_at: now,
    })
    .eq("id", agreementId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToAgreement(data as AgreementRow);
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

  return rowToAgreement(data as AgreementRow);
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
  const supabase = getSupabase();
  const { error } = await supabase
    .from("project_client_agreements")
    .delete()
    .eq("id", agreementId)
    .eq("status", "draft");

  if (error) {
    throw new Error(error.message);
  }
}
