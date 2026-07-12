import { resolveAgreementSourceLink } from "@/lib/my-work/link-resolver";
import type { WorkItem } from "@/lib/my-work/types";
import type { WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

export const projectAgreementWorkItemAdapter: WorkItemSourceAdapter = {
  sourceType: "project_agreement",

  async fetchMirror() {
    return {};
  },

  async syncToSource() {
    // Akceptacja ustaleń odbywa się w module Ustaleń — brak prostego PATCH z Moja praca.
  },

  resolveSourceLink(workItem: Pick<WorkItem, "sourceId" | "projectId" | "clientId">) {
    return resolveAgreementSourceLink(workItem.sourceId, {
      projectId: workItem.projectId,
      clientId: workItem.clientId,
    });
  },
};
