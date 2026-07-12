import { manualWorkItemAdapter } from "@/lib/my-work/source-adapters/manual-adapter";
import { kanbanTaskWorkItemAdapter } from "@/lib/my-work/source-adapters/kanban-task-adapter";
import type { WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

const adapters: WorkItemSourceAdapter[] = [manualWorkItemAdapter, kanbanTaskWorkItemAdapter];

const registry = new Map(adapters.map((adapter) => [adapter.sourceType, adapter]));

export function getWorkItemSourceAdapter(sourceType: string): WorkItemSourceAdapter | null {
  return registry.get(sourceType) ?? null;
}

export function listWorkItemSourceAdapters() {
  return adapters;
}
