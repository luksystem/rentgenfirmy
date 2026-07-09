import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position);
}

export function cloneProcessTemplate(template: ProcessTemplate): ProcessTemplate {
  return JSON.parse(JSON.stringify(template)) as ProcessTemplate;
}

export function parseProcessTemplateSnapshot(value: unknown): ProcessTemplate | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.projectType !== "string") {
    return null;
  }

  if (!Array.isArray(value.stages)) {
    return null;
  }

  const stages = sortByPosition(
    value.stages
      .filter(isRecord)
      .map((stage) => ({
        id: String(stage.id),
        templateId: String(stage.templateId ?? value.id),
        title: String(stage.title ?? ""),
        position: Number(stage.position ?? 0),
        minPeopleCount: Number(stage.minPeopleCount ?? 1),
        optimalPeopleCount: stage.optimalPeopleCount == null ? null : Number(stage.optimalPeopleCount),
        estimatedDurationDays: stage.estimatedDurationDays == null ? null : Number(stage.estimatedDurationDays),
        estimatedLaborHours: stage.estimatedLaborHours == null ? null : Number(stage.estimatedLaborHours),
        defaultLaborBudget: stage.defaultLaborBudget == null ? null : Number(stage.defaultLaborBudget),
        defaultMaterialBudget: stage.defaultMaterialBudget == null ? null : Number(stage.defaultMaterialBudget),
        defaultRiskItemId: stage.defaultRiskItemId ? String(stage.defaultRiskItemId) : null,
        canRunInParallel: stage.canRunInParallel === true,
        requiresLeader: stage.requiresLeader === true,
        allowsTrainee: stage.allowsTrainee !== false,
        requiredRoles: (Array.isArray(stage.requiredRoles) ? stage.requiredRoles : [])
          .filter(isRecord)
          .map((requirement) => ({
            roleItemId: String(requirement.roleItemId ?? ""),
            minCount: Number(requirement.minCount ?? 1),
          })),
        requiredCompetencies: (Array.isArray(stage.requiredCompetencies) ? stage.requiredCompetencies : [])
          .filter(isRecord)
          .map((requirement) => ({
            competencyItemId: String(requirement.competencyItemId ?? ""),
            minLevelItemId: requirement.minLevelItemId ? String(requirement.minLevelItemId) : null,
          })),
        dependsOnStageIds: (Array.isArray(stage.dependsOnStageIds) ? stage.dependsOnStageIds : []).map((id) =>
          String(id),
        ),
        milestones: sortByPosition(
          (Array.isArray(stage.milestones) ? stage.milestones : [])
            .filter(isRecord)
            .map((milestone) => ({
              id: String(milestone.id),
              stageId: String(milestone.stageId ?? stage.id),
              title: String(milestone.title ?? ""),
              position: Number(milestone.position ?? 0),
              items: sortByPosition(
                (Array.isArray(milestone.items) ? milestone.items : [])
                  .filter(isRecord)
                  .map((item) => ({
                    id: String(item.id),
                    milestoneId: String(item.milestoneId ?? milestone.id),
                    elementId: String(item.elementId ?? ""),
                    kind: item.kind as ProcessTemplate["stages"][number]["milestones"][number]["items"][number]["kind"],
                    title: String(item.title ?? ""),
                    position: Number(item.position ?? 0),
                    defaultPayload: item.defaultPayload as ProcessTemplate["stages"][number]["milestones"][number]["items"][number]["defaultPayload"],
                    isInternalAcceptance: item.isInternalAcceptance === true,
                  })),
              ),
            })),
        ),
      })),
  );

  return {
    id: value.id,
    projectType: value.projectType,
    name: String(value.name ?? ""),
    description: String(value.description ?? ""),
    stages,
    createdAt: String(value.createdAt ?? new Date().toISOString()),
    updatedAt: String(value.updatedAt ?? new Date().toISOString()),
  };
}

export function resolveAnchoredProcessTemplate(
  process: ProjectProcess,
  liveTemplate: ProcessTemplate | null | undefined,
): ProcessTemplate | null {
  return process.templateSnapshot ?? liveTemplate ?? null;
}

export function collectTemplateItemIds(template: ProcessTemplate) {
  return new Set(
    template.stages.flatMap((stage) =>
      stage.milestones.flatMap((milestone) => milestone.items.map((item) => item.id)),
    ),
  );
}

export function collectTemplateMilestoneIds(template: ProcessTemplate) {
  return new Set(
    template.stages.flatMap((stage) => stage.milestones.map((milestone) => milestone.id)),
  );
}
