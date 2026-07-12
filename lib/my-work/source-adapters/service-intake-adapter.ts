import { resolveServiceIntakeSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const serviceIntakeWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "service_intake",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, workItem, patch: WorkItemPatch) {
    if (!workItem.sourceId) {
      return;
    }
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.reference_number = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.dueDate !== undefined) payload.due_at = patch.dueDate ? `${patch.dueDate}T12:00:00Z` : null;
    if (patch.assignedUserId !== undefined) payload.assignee_id = patch.assignedUserId;
    if (patch.priority !== undefined) {
      const reverse: Record<string, string> = { urgent: "c", high: "a", low: "f", normal: "e" };
      payload.priority = reverse[patch.priority] ?? "a";
    }
    if (patch.status !== undefined) {
      if (patch.status === "in_progress") payload.status = "in_review";
      if (patch.status === "pending_ack" || patch.status === "sent") payload.status = "new";
    }
    if (Object.keys(payload).length <= 1) {
      return;
    }
    await admin.from("service_intake_requests").update(payload).eq("id", workItem.sourceId);
  },

  resolveSourceLink() {
    return resolveServiceIntakeSourceLink();
  },
};
