import type { ActivityLogInput } from "@/lib/activity-log/types";

export function activityLogInsertPayload(input: ActivityLogInput) {
  return {
    id: crypto.randomUUID(),
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName.trim() || "Użytkownik",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel?.trim() ?? "",
    summary: input.summary.trim(),
    href: input.href ?? null,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  };
}
