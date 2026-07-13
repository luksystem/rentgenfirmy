import type { WorkItemStatus } from "@/lib/my-work/types";
import { isTerminalWorkItemStatus } from "@/lib/my-work/types";

export const SYNCED_WORK_ITEM_SOURCE_TABLES: Record<string, string> = {
  process_item: "project_process_items",
  kanban_task: "process_kanban_tasks",
  service_intake: "service_intake_requests",
  project_agreement: "project_client_agreements",
  inspection: "inspections",
  resource_plan_item: "resource_plan_items",
  functionality_task: "project_functionality_tasks",
};

export type OrphanWorkItemCandidate = {
  id: string;
  sourceType: string;
  sourceId: string | null;
  status: WorkItemStatus;
};

export function findOrphanedWorkItemIds(
  workItems: OrphanWorkItemCandidate[],
  existingSourceIdsByType: Map<string, Set<string>>,
): string[] {
  return workItems
    .filter((item) => {
      if (!item.sourceId || item.sourceType === "manual") {
        return false;
      }
      if (isTerminalWorkItemStatus(item.status)) {
        return false;
      }
      const existingIds = existingSourceIdsByType.get(item.sourceType);
      if (!existingIds) {
        return false;
      }
      return !existingIds.has(item.sourceId);
    })
    .map((item) => item.id);
}
