import { resolveProcessItemSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemPatch, WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";
import { syncWorkItemToProcessItemServer } from "@/lib/supabase/process-work-item-sync-server";

export const processItemWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "process_item",

  async fetchMirror() {
    return {};
  },

  async syncToSource(admin, workItem, patch: WorkItemPatch) {
    await syncWorkItemToProcessItemServer(admin, workItem, patch);
  },

  resolveSourceLink(workItem: Pick<WorkItem, "projectId">) {
    return resolveProcessItemSourceLink(workItem.projectId);
  },
};
