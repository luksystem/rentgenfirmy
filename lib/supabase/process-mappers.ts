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
  ProcessStageCompetencyRequirementRow,
  ProcessStageDependencyRow,
  ProcessStageRoleRequirementRow,
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
  requirements?: {
    roles?: ProcessStageRoleRequirementRow[];
    competencies?: ProcessStageCompetencyRequirementRow[];
    dependencies?: ProcessStageDependencyRow[];
  },
): ProcessStage {
  return {
    id: row.id,
    templateId: row.template_id,
    title: row.title,
    description: row.description ?? "",
    forClosing: Boolean(row.for_closing),
    position: row.position,
    milestones: milestones.sort((a, b) => a.position - b.position),
    minPeopleCount: row.min_people_count ?? 1,
    optimalPeopleCount: row.optimal_people_count ?? null,
    estimatedDurationDays: row.estimated_duration_days ?? null,
    estimatedLaborHours: row.estimated_labor_hours ?? null,
    defaultLaborBudget: row.default_labor_budget ?? null,
    defaultMaterialBudget: row.default_material_budget ?? null,
    defaultRiskItemId: row.default_risk_item_id ?? null,
    canRunInParallel: Boolean(row.can_run_in_parallel),
    requiresLeader: Boolean(row.requires_leader),
    allowsTrainee: row.allows_trainee ?? true,
    requiredRoles: (requirements?.roles ?? []).map((r) => ({ roleItemId: r.role_item_id, minCount: r.min_count })),
    requiredCompetencies: (requirements?.competencies ?? []).map((c) => ({
      competencyItemId: c.competency_item_id,
      minLevelItemId: c.min_level_item_id,
    })),
    dependsOnStageIds: (requirements?.dependencies ?? []).map((d) => d.depends_on_stage_id),
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
