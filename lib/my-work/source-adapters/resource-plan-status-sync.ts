import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkItemStatus } from "@/lib/my-work/types";
import type { WorkItemPatch } from "@/lib/my-work/source-adapters/types";

type AdminClient = SupabaseClient;

let planStatusIdByName: Map<string, string> | null = null;

async function ensurePlanStatusIds(admin: AdminClient) {
  if (planStatusIdByName) {
    return planStatusIdByName;
  }
  const { data, error } = await admin
    .from("resource_dictionary_items")
    .select("id, name")
    .eq("dictionary_key", "plan_status");
  if (error) {
    throw new Error(error.message);
  }
  planStatusIdByName = new Map((data ?? []).map((row) => [row.name as string, row.id as string]));
  return planStatusIdByName;
}

export function mapWorkItemStatusToPlanStatusName(
  status: WorkItemStatus,
  completedAt?: string | null,
): string {
  if (completedAt || status === "verified" || status === "pending_verification") {
    return "Zakończone";
  }
  switch (status) {
    case "blocked":
      return "Wstrzymane";
    case "risk_reported":
      return "Zagrożone";
    case "in_progress":
      return "W realizacji";
    default:
      return "Planowane";
  }
}

export async function resolvePlanStatusItemId(
  admin: AdminClient,
  patch: WorkItemPatch,
  currentStatus?: WorkItemStatus,
) {
  const statusName =
    patch.completedAt != null
      ? "Zakończone"
      : patch.status !== undefined
        ? mapWorkItemStatusToPlanStatusName(patch.status, patch.completedAt)
        : currentStatus !== undefined
          ? mapWorkItemStatusToPlanStatusName(currentStatus, patch.completedAt)
          : null;

  if (!statusName) {
    return null;
  }

  const ids = await ensurePlanStatusIds(admin);
  return ids.get(statusName) ?? null;
}
