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
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    kind: isProcessItemKind(row.kind) ? row.kind : "checklist",
    title: row.title,
    position: row.position,
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
    plannedDate: row.planned_date ?? null,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectProcessToUpdate(process: ProjectProcess) {
  return {
    completions: process.completions,
    updated_at: process.updatedAt,
  };
}
