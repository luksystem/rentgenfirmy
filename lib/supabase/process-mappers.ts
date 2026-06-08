import { normalizeChecklistPayload, templatePayloadFromTitle } from "@/lib/process/item-payload";
import type {
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
  return value === "checklist" || value === "protocol" || value === "settlement";
}

export function rowToProcessItem(row: ProcessItemRow): ProcessItem {
  const kind = isProcessItemKind(row.kind) ? row.kind : "checklist";
  const normalized = normalizeChecklistPayload(row.default_payload);
  const defaultPayload =
    normalized.lines.length > 0 ? normalized : templatePayloadFromTitle(row.title, kind);

  return {
    id: row.id,
    milestoneId: row.milestone_id,
    kind,
    title: row.title,
    position: row.position,
    defaultPayload,
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
    completions:
      completions && typeof completions === "object" && !Array.isArray(completions)
        ? (completions as Record<string, ProcessItemCompletion>)
        : {},
    milestoneDates: normalizeMilestoneDates(row.milestone_dates),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectProcessToUpdate(process: ProjectProcess) {
  return {
    completions: process.completions,
    milestone_dates: process.milestoneDates,
    updated_at: process.updatedAt,
  };
}
