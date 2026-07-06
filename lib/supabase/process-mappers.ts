import { parseProcessTemplateSnapshot } from "@/lib/process/anchored-template";
import { resolveElementDefaultPayload } from "@/lib/process/item-payload";
import type {
  ProcessElement,
  ProcessItem,
  ProcessItemCompletion,
  ProcessMilestone,
  ProcessStage,
  ProcessTemplate,
  ProjectProcess,
} from "@/lib/process/types";
import type {
  ProcessItemRow,
  ProcessMilestoneRow,
  ProcessStageRow,
  ProcessTemplateRow,
  ProjectProcessRow,
} from "@/lib/supabase/database.types";

function isProcessItemKind(value: string): value is ProcessItem["kind"] {
  return (
    value === "checklist" ||
    value === "protocol" ||
    value === "settlement" ||
    value === "kanban" ||
    value === "note"
  );
}

export function rowToProcessItem(
  row: ProcessItemRow,
  elementsById: Map<string, ProcessElement>,
): ProcessItem {
  const element = row.element_id ? elementsById.get(row.element_id) : undefined;
  const kind = element?.kind ?? (isProcessItemKind(row.kind) ? row.kind : "checklist");
  const title = element?.title ?? row.title;
  const defaultPayload = resolveElementDefaultPayload(
    kind,
    element?.defaultPayload ?? row.default_payload,
    title,
  );

  return {
    id: row.id,
    milestoneId: row.milestone_id,
    elementId: row.element_id ?? element?.id ?? "",
    kind,
    title,
    position: row.position,
    defaultPayload,
    isInternalAcceptance: Boolean(row.is_internal_acceptance ?? element?.isInternalAcceptance),
  };
}

export function rowToProcessMilestone(
  row: ProcessMilestoneRow,
  items: ProcessItem[],
): ProcessMilestone {
  return {
    id: row.id,
    stageId: row.stage_id,
    title: row.title,
    position: row.position,
    items: items.sort((a, b) => a.position - b.position),
  };
}

export function rowToProcessStage(
  row: ProcessStageRow,
  milestones: ProcessMilestone[],
): ProcessStage {
  return {
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    position: row.position,
    milestones: milestones.sort((a, b) => a.position - b.position),
  };
}

export function rowToProcessTemplate(
  row: ProcessTemplateRow,
  stages: ProcessStage[],
): ProcessTemplate {
  return {
    id: row.id,
    projectType: row.project_type,
    name: row.name,
    description: row.description,
    stages: stages.sort((a, b) => a.position - b.position),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeMilestoneDates(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, dateValue]) => [
      key,
      typeof dateValue === "string" ? dateValue : null,
    ]),
  );
}

export function rowToProjectProcess(row: ProjectProcessRow): ProjectProcess {
  const completions = row.completions;
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    templateSnapshot: parseProcessTemplateSnapshot(row.template_snapshot),
    completions:
      completions && typeof completions === "object" && !Array.isArray(completions)
        ? (completions as Record<string, ProcessItemCompletion>)
        : {},
    milestoneDates: normalizeMilestoneDates(row.milestone_dates),
    activeStageId: row.active_stage_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectProcessToUpdate(process: ProjectProcess) {
  return {
    template_id: process.templateId,
    template_snapshot: process.templateSnapshot,
    completions: process.completions,
    milestone_dates: process.milestoneDates,
    active_stage_id: process.activeStageId,
    updated_at: process.updatedAt,
  };
}
