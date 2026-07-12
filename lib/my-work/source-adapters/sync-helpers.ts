import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkItemMirrorFields } from "@/lib/my-work/source-adapters/types";
import type { WorkItemPriority, WorkItemStatus } from "@/lib/my-work/types";

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
