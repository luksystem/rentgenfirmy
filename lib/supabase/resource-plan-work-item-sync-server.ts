import type { SupabaseClient } from "@supabase/supabase-js";
import { mapResourcePlanStatusName } from "@/lib/my-work/source-adapters/status-mappers";

type AdminClient = SupabaseClient;

let completedPlanStatusId: string | null | undefined;

export async function getCompletedResourcePlanStatusId(admin: AdminClient) {
  if (completedPlanStatusId !== undefined) {
    return completedPlanStatusId;
  }
  const { data } = await admin
    .from("resource_dictionary_items")
    .select("id")
    .eq("dictionary_key", "plan_status")
    .eq("name", "Zakończone")
    .maybeSingle();
  completedPlanStatusId = data?.id ?? null;
  return completedPlanStatusId;
}

async function resolveResourcePlanStatusName(admin: AdminClient, statusItemId: string | null) {
  if (!statusItemId) {
    return null;
  }
  const { data } = await admin
    .from("resource_dictionary_items")
    .select("name")
    .eq("id", statusItemId)
    .maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

export async function syncWorkItemsFromResourcePlanItemServer(admin: AdminClient, planItemId: string) {
  const { data: row, error } = await admin
    .from("resource_plan_items")
    .select("id, title, notes, start_at, end_at, project_id, client_id, assignee_id, status_item_id")
    .eq("id", planItemId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    return;
  }

  const statusName = await resolveResourcePlanStatusName(admin, row.status_item_id as string | null);
  const workStatus = mapResourcePlanStatusName(statusName);
  const now = new Date().toISOString();
  const isCompleted = statusName === "Zakończone" || workStatus === "verified";

  const payload: Record<string, unknown> = {
    title: row.title as string,
    description: (row.notes as string) ?? "",
    due_date: row.end_at ? String(row.end_at).slice(0, 10) : null,
    project_id: row.project_id as string | null,
    client_id: row.client_id as string | null,
    status: workStatus,
    updated_at: now,
  };

  if (isCompleted) {
    payload.completed_at = now;
    payload.verified_at = now;
  }

  const { error: updateError } = await admin
    .from("work_items")
    .update(payload)
    .eq("source_type", "resource_plan_item")
    .eq("source_id", planItemId);
  if (updateError) {
    throw new Error(updateError.message);
  }
}
