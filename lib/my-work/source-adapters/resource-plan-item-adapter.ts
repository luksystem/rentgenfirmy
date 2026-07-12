import { resolveResourcePlanSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const resourcePlanItemWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "resource_plan_item",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, workItem, patch: WorkItemPatch) {
    if (!workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.notes = patch.description;
    if (patch.dueDate !== undefined) payload.end_at = patch.dueDate ? `${patch.dueDate}T17:00:00Z` : payload.end_at;
    if (patch.assignedUserId !== undefined) payload.assignee_id = patch.assignedUserId;
    if (Object.keys(payload).length <= 1) {
      return;
    }
    await admin.from("resource_plan_items").update(payload).eq("id", workItem.sourceId);
  },

  resolveSourceLink(workItem: Pick<WorkItem, "projectId">) {
    return resolveResourcePlanSourceLink(workItem.projectId);
  },
};
