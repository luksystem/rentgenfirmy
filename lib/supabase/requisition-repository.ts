import {
  normalizeRequisitionInput,
  type Requisition,
  type RequisitionInput,
  type RequisitionStatus,
} from "@/lib/requisitions/types";
import { getSupabase } from "@/lib/supabase/client";

type RequisitionRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  scope: string;
  status: string;
  project_id: string | null;
  client_id: string | null;
  requested_by_name: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  order_owner_id: string | null;
  order_due_at: string | null;
  created_at: string;
  updated_at: string;
};

function isStatus(value: string): value is RequisitionStatus {
  return (
    value === "draft" ||
    value === "submitted" ||
    value === "approved" ||
    value === "rejected" ||
    value === "ordered" ||
    value === "fulfilled"
  );
}

export function rowToRequisition(row: RequisitionRow): Requisition {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: (["clothing", "tools", "equipment", "other"].includes(row.category)
      ? row.category
      : "other") as Requisition["category"],
    scope: (["personal", "project", "general"].includes(row.scope)
      ? row.scope
      : "general") as Requisition["scope"],
    status: isStatus(row.status) ? row.status : "draft",
    projectId: row.project_id,
    clientId: row.client_id,
    requestedByName: row.requested_by_name,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    orderOwnerId: row.order_owner_id,
    orderDueAt: row.order_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRequisitions(options?: {
  status?: RequisitionStatus;
  scope?: Requisition["scope"];
}) {
  const supabase = getSupabase();
  let query = supabase.from("requisitions").select("*").order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.scope) {
    query = query.eq("scope", options.scope);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToRequisition(row as RequisitionRow));
}

export async function createRequisition(input: RequisitionInput, requestedByName: string) {
  const normalized = normalizeRequisitionInput(input);
  if (!normalized.title) {
    throw new Error("Podaj tytuł zapotrzebowania.");
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("requisitions")
    .insert({
      id: crypto.randomUUID(),
      title: normalized.title,
      description: normalized.description ?? "",
      category: normalized.category,
      scope: normalized.scope,
      status: "draft",
      project_id: normalized.projectId,
      client_id: normalized.clientId,
      requested_by_name: requestedByName.trim() || "Zespół",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToRequisition(data as RequisitionRow);
}

export async function updateRequisitionStatus(
  requisitionId: string,
  status: RequisitionStatus,
  reviewerName: string,
  reviewNote?: string,
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("requisitions")
    .update({
      status,
      reviewed_by_name: reviewerName.trim() || "Zespół",
      reviewed_at: now,
      review_note: reviewNote?.trim() ?? "",
      updated_at: now,
    })
    .eq("id", requisitionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToRequisition(data as RequisitionRow);
}

export async function updateRequisitionOrderPlan(
  requisitionId: string,
  input: { orderOwnerId: string | null; orderDueAt: string | null },
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("requisitions")
    .update({
      order_owner_id: input.orderOwnerId,
      order_due_at: input.orderDueAt,
      updated_at: now,
    })
    .eq("id", requisitionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToRequisition(data as RequisitionRow);
}

export async function deleteRequisition(requisitionId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("requisitions").delete().eq("id", requisitionId);

  if (error) {
    throw new Error(error.message);
  }
}
