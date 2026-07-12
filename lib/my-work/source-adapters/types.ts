import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkItem, WorkItemPriority } from "@/lib/my-work/types";

export type WorkItemMirrorFields = Partial<
  Pick<
    WorkItem,
    | "title"
    | "description"
    | "dueDate"
    | "priority"
    | "projectId"
    | "clientId"
    | "processStageId"
    | "assignedUserId"
    | "status"
    | "blockedReason"
    | "completedAt"
  >
>;

export type WorkItemPatch = WorkItemMirrorFields;

export interface WorkItemSourceAdapter {
  sourceType: string;
  fetchMirror(admin: SupabaseClient, sourceId: string): Promise<WorkItemMirrorFields>;
  syncToSource(admin: SupabaseClient, workItem: WorkItem, patch: WorkItemPatch): Promise<void>;
  resolveSourceLink(workItem: Pick<WorkItem, "sourceType" | "sourceId" | "projectId" | "clientId">): string | null;
  inferInitialStatus?(mirror: WorkItemMirrorFields): WorkItem["status"];
}

export function mapKanbanPriorityToWork(priority: string): WorkItemPriority {
  if (priority === "low" || priority === "normal" || priority === "high" || priority === "urgent") {
    return priority;
  }
  return "normal";
}
