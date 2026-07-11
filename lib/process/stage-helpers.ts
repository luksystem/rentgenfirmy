import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import type { ProcessStage, ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import {
  isInProgressFlowStatus,
  isWaitingFlowStatus,
  type FieldOptions,
} from "@/lib/field-options";
import type { Project } from "@/lib/types";

export function normalizeStageTitle(title: string) {
  return title.trim().toLowerCase();
}

export function findStageByTitle(
  template: ProcessTemplate | null | undefined,
  title: string,
): ProcessStage | undefined {
  if (!template) {
    return undefined;
  }

  const normalized = normalizeStageTitle(title);
  return template.stages.find((stage) => normalizeStageTitle(stage.title) === normalized);
}

export function resolveActiveProcessStage(
  process: ProjectProcess | null | undefined,
  template: ProcessTemplate | null | undefined,
): ProcessStage | null {
  if (!process?.activeStageId || !template) {
    return null;
  }

  return template.stages.find((stage) => stage.id === process.activeStageId) ?? null;
}

export function resolveProjectActiveStageTitle(
  project: Pick<Project, "stage">,
  process: ProjectProcess | null | undefined,
  template: ProcessTemplate | null | undefined,
): string {
  const activeStage = resolveActiveProcessStage(process, template);
  return activeStage?.title ?? project.stage;
}

export function isActiveStageForClosing(
  process: ProjectProcess | null | undefined,
  template: ProcessTemplate | null | undefined,
): boolean {
  const activeStage = resolveActiveProcessStage(process, template);
  return Boolean(activeStage?.forClosing);
}

export function isProjectForClosingWithProcess(
  project: Pick<Project, "flowStatus" | "id">,
  options: FieldOptions,
  process: ProjectProcess | null | undefined,
  liveTemplate: ProcessTemplate | null | undefined,
): boolean {
  const template = process ? resolveAnchoredProcessTemplate(process, liveTemplate) : null;
  const flowAllowsClosing =
    isInProgressFlowStatus(project.flowStatus, options) ||
    isWaitingFlowStatus(project.flowStatus, options);

  return flowAllowsClosing && isActiveStageForClosing(process, template);
}

export function buildProjectClosingFlagsMap(
  projects: Project[],
  projectProcesses: Record<string, ProjectProcess>,
  templates: ProcessTemplate[],
  options: FieldOptions,
): Map<string, boolean> {
  const templatesByType = new Map(templates.map((template) => [template.projectType, template]));
  const map = new Map<string, boolean>();

  for (const project of projects) {
    const process = projectProcesses[project.id] ?? null;
    const liveTemplate = templatesByType.get(project.type);
    map.set(
      project.id,
      isProjectForClosingWithProcess(project, options, process, liveTemplate),
    );
  }

  return map;
}

export function mergeProcessStageTitles(templates: ProcessTemplate[]): string[] {
  const columnMeta = new Map<string, { title: string; position: number }>();

  for (const template of templates) {
    for (const stage of template.stages) {
      const key = normalizeStageTitle(stage.title);
      const existing = columnMeta.get(key);
      if (!existing || stage.position < existing.position) {
        columnMeta.set(key, { title: stage.title.trim(), position: stage.position });
      }
    }
  }

  return [...columnMeta.entries()]
    .sort((left, right) => left[1].position - right[1].position)
    .map(([, meta]) => meta.title);
}

export function defaultStageTitleFromTemplate(
  template: ProcessTemplate | null | undefined,
): string {
  const sorted = template?.stages.slice().sort((left, right) => left.position - right.position);
  return sorted?.[0]?.title ?? "Etap 1";
}

export function stageTitlesFromTemplate(template: ProcessTemplate | null | undefined): string[] {
  if (!template) {
    return [];
  }

  return [...template.stages]
    .sort((left, right) => left.position - right.position)
    .map((stage) => stage.title);
}

export function resolveProcessTemplateForProject(
  project: Pick<Project, "id" | "type">,
  projectProcesses: Record<string, ProjectProcess>,
  templates: ProcessTemplate[],
): ProcessTemplate | null {
  const process = projectProcesses[project.id];
  const liveTemplate = templates.find((template) => template.projectType === project.type);
  return process ? resolveAnchoredProcessTemplate(process, liveTemplate) : (liveTemplate ?? null);
}
