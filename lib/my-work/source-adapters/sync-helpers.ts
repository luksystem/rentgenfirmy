import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkItemMirrorFields } from "@/lib/my-work/source-adapters/types";
import type { WorkItemPriority, WorkItemStatus } from "@/lib/my-work/types";
import {
  findOrphanedWorkItemIds,
  SYNCED_WORK_ITEM_SOURCE_TABLES,
  type OrphanWorkItemCandidate,
} from "@/lib/my-work/orphan-work-items";

type AdminClient = SupabaseClient;

export async function upsertWorkItemFromMirror(
  admin: AdminClient,
  input: {
    sourceType: string;
    sourceId: string;
    assignedUserId: string;
    managerId: string | null;
    mirror: WorkItemMirrorFields;
    status: WorkItemStatus;
  },
) {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("work_items")
    .select("id")
    .eq("source_type", input.sourceType)
    .eq("source_id", input.sourceId)
    .eq("assigned_user_id", input.assignedUserId)
    .maybeSingle();

  const payload = {
    source_type: input.sourceType,
    source_id: input.sourceId,
    project_id: input.mirror.projectId ?? null,
    client_id: input.mirror.clientId ?? null,
    process_stage_id: input.mirror.processStageId ?? null,
    assigned_user_id: input.assignedUserId,
    manager_id: input.managerId,
    title: input.mirror.title ?? "",
    description: input.mirror.description ?? "",
    due_date: input.mirror.dueDate ?? null,
    priority: (input.mirror.priority ?? "normal") as WorkItemPriority,
    status: input.status,
    blocked_reason: input.mirror.blockedReason ?? "",
    updated_at: now,
  };

  if (existing?.id) {
    await admin.from("work_items").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const id = crypto.randomUUID();
  await admin.from("work_items").insert({
    id,
    ...payload,
    created_at: now,
  });
  return id;
}

/** Anuluje zadania zsynchronizowane ze źródeł, które już nie istnieją (np. usunięty element procesu). */
export async function cancelOrphanedSyncedWorkItems(admin: AdminClient, assignedUserId: string) {
  const { data: workItems, error } = await admin
    .from("work_items")
    .select("id, source_type, source_id, status")
    .eq("assigned_user_id", assignedUserId)
    .not("source_id", "is", null)
    .neq("source_type", "manual");

  if (error) {
    throw new Error(error.message);
  }

  const candidates: OrphanWorkItemCandidate[] = (workItems ?? []).map((row) => ({
    id: row.id as string,
    sourceType: row.source_type as string,
    sourceId: row.source_id as string | null,
    status: row.status as OrphanWorkItemCandidate["status"],
  }));
  if (!candidates.length) {
    return;
  }

  const sourceIdsByType = new Map<string, Set<string>>();
  for (const item of candidates) {
    if (!item.sourceId || item.sourceType === "manual") {
      continue;
    }
    const bucket = sourceIdsByType.get(item.sourceType) ?? new Set<string>();
    bucket.add(item.sourceId);
    sourceIdsByType.set(item.sourceType, bucket);
  }

  const existingSourceIdsByType = new Map<string, Set<string>>();
  await Promise.all(
    [...sourceIdsByType.entries()].map(async ([sourceType, sourceIds]) => {
      const table = SYNCED_WORK_ITEM_SOURCE_TABLES[sourceType];
      if (!table || !sourceIds.size) {
        return;
      }
      const { data, error: lookupError } = await admin.from(table).select("id").in("id", [...sourceIds]);
      if (lookupError) {
        throw new Error(lookupError.message);
      }
      existingSourceIdsByType.set(
        sourceType,
        new Set((data ?? []).map((row) => row.id as string)),
      );
    }),
  );

  const orphanIds = findOrphanedWorkItemIds(candidates, existingSourceIdsByType);
  if (!orphanIds.length) {
    return;
  }

  const now = new Date().toISOString();
  const { error: cancelError } = await admin
    .from("work_items")
    .update({ status: "cancelled", updated_at: now })
    .in("id", orphanIds);
  if (cancelError) {
    throw new Error(cancelError.message);
  }

  const { error: planItemsError } = await admin.from("work_plan_items").delete().in("work_item_id", orphanIds);
  if (planItemsError) {
    throw new Error(planItemsError.message);
  }
}
