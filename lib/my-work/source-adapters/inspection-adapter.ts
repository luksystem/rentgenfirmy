import { resolveInspectionSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const inspectionWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "inspection",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, workItem, patch: WorkItemPatch) {
    if (!workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.work_scope = patch.description;
    if (patch.dueDate !== undefined) {
      payload.confirmed_date = patch.dueDate;
    }
    if (patch.assignedUserId !== undefined) payload.assignee_id = patch.assignedUserId;
    if (Object.keys(payload).length <= 1) {
      return;
    }
    await admin.from("inspections").update(payload).eq("id", workItem.sourceId);
  },

  resolveSourceLink() {
    return resolveInspectionSourceLink();
  },
};
