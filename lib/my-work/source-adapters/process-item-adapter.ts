import { resolveProcessItemSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const processItemWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "process_item",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, _workItem, patch: WorkItemPatch) {
    if (!_workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.assignedUserId !== undefined) {
      payload.assignee_id = patch.assignedUserId;
    }
    if (patch.status !== undefined) {
      if (patch.status === "in_progress") {
        payload.status = "in_progress";
      } else if (patch.status === "verified" || patch.status === "done") {
        payload.status = "completed";
      } else if (patch.status === "pending_ack" || patch.status === "sent") {
        payload.status = "open";
      }
    }
    if (Object.keys(payload).length <= 1) {
      return;
    }
    await admin.from("project_process_items").update(payload).eq("id", _workItem.sourceId);
  },

  resolveSourceLink(workItem: Pick<WorkItem, "projectId">) {
    return resolveProcessItemSourceLink(workItem.projectId);
  },
};
