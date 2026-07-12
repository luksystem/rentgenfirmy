import { resolveManualSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const manualWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "manual",

  async fetchMirror() {
    return {};
  },

  async syncToSource() {
    // Manual tasks: all fields live on work_items — sync handled by repository directly.
  },

  resolveSourceLink() {
    return resolveManualSourceLink();
  },
};
