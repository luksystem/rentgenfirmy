import { resolveFunctionalityTaskSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const functionalityTaskWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "functionality_task",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, workItem, patch: WorkItemPatch) {
    if (!workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.assignedUserId !== undefined) payload.assignee_id = patch.assignedUserId;
    if (patch.status !== undefined) {
      if (patch.status === "in_progress") payload.status = "in_progress";
      if (patch.status === "verified" || patch.status === "done") payload.status = "done";
      if (patch.status === "pending_ack" || patch.status === "sent") payload.status = "todo";
    }
    if (Object.keys(payload).length <= 1) {
      return;
    }
    await admin.from("project_functionality_tasks").update(payload).eq("id", workItem.sourceId);
  },

  resolveSourceLink(workItem: Pick<WorkItem, "projectId">) {
    return resolveFunctionalityTaskSourceLink(workItem.projectId);
  },
};
