import { manualWorkItemAdapter } from "@/lib/my-work/source-adapters/manual-adapter";
import { kanbanTaskWorkItemAdapter } from "@/lib/my-work/source-adapters/kanban-task-adapter";
import { processItemWorkItemAdapter } from "@/lib/my-work/source-adapters/process-item-adapter";
import { serviceIntakeWorkItemAdapter } from "@/lib/my-work/source-adapters/service-intake-adapter";
import { projectAgreementWorkItemAdapter } from "@/lib/my-work/source-adapters/project-agreement-adapter";
import { inspectionWorkItemAdapter } from "@/lib/my-work/source-adapters/inspection-adapter";
import { resourcePlanItemWorkItemAdapter } from "@/lib/my-work/source-adapters/resource-plan-item-adapter";
import { functionalityTaskWorkItemAdapter } from "@/lib/my-work/source-adapters/functionality-task-adapter";
import type { WorkItemSourceAdapter } from "@/lib/my-work/source-adapters/types";

const adapters: WorkItemSourceAdapter[] = [
  manualWorkItemAdapter,
  kanbanTaskWorkItemAdapter,
  processItemWorkItemAdapter,
  serviceIntakeWorkItemAdapter,
  projectAgreementWorkItemAdapter,
  inspectionWorkItemAdapter,
  resourcePlanItemWorkItemAdapter,
  functionalityTaskWorkItemAdapter,
];

const registry = new Map(adapters.map((adapter) => [adapter.sourceType, adapter]));

export function getWorkItemSourceAdapter(sourceType: string): WorkItemSourceAdapter | null {
  return registry.get(sourceType) ?? null;
}

export function listWorkItemSourceAdapters() {
  return adapters;
}
