import type { WorkItem } from "@/lib/my-work/types";
import { workItemLinkUrl } from "@/lib/my-work/types";

export function resolveMyWorkItemLink(workItemId: string) {
  return workItemLinkUrl(workItemId);
}

export function resolveManualSourceLink() {
  return null;
}

export function resolveKanbanSourceLink(projectId: string | null) {
  if (!projectId) {
    return "/tablice-wdrozen";
  }
  return `/projekty/${projectId}/proces`;
}

export function resolveSourceLinkForItem(item: Pick<WorkItem, "sourceType" | "sourceId" | "projectId">) {
  if (item.sourceType === "kanban_task" && item.sourceId) {
    return resolveKanbanSourceLink(item.projectId);
  }
  if (item.sourceType === "manual") {
    return null;
  }
  return null;
}
