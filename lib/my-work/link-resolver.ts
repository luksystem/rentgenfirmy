import type { WorkItem } from "@/lib/my-work/types";
import { workItemLinkUrl } from "@/lib/my-work/types";
import { getWorkItemSourceAdapter } from "@/lib/my-work/source-adapters/registry";

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

export function resolveProcessItemSourceLink(projectId: string | null) {
  return resolveKanbanSourceLink(projectId);
}

export function resolveServiceIntakeSourceLink() {
  return "/oferty/zgloszenia";
}

export function resolveAgreementSourceLink(agreementId: string | null) {
  if (!agreementId) {
    return "/ustalenia";
  }
  return `/ustalenia?agreement=${agreementId}`;
}

export function resolveInspectionSourceLink() {
  return "/przeglady";
}

export function resolveResourcePlanSourceLink(projectId: string | null) {
  if (!projectId) {
    return "/plan-zasobow";
  }
  return `/plan-zasobow?project=${projectId}`;
}

export function resolveFunctionalityTaskSourceLink(projectId: string | null) {
  if (!projectId) {
    return "/projekty";
  }
  return `/projekty/${projectId}`;
}

export function resolveSourceLinkForItem(item: Pick<WorkItem, "sourceType" | "sourceId" | "projectId">) {
  const adapter = getWorkItemSourceAdapter(item.sourceType);
  if (adapter) {
    return adapter.resolveSourceLink(item);
  }
  if (item.sourceType === "kanban_task" && item.sourceId) {
    return resolveKanbanSourceLink(item.projectId);
  }
  return null;
}
