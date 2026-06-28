import type { ProcessItem, ProcessTemplate, ProjectProcess } from "@/lib/process/types";

/** Włączenie sekwencyjnego odblokowywania etapów — na razie wyłączone. */
export const PROCESS_STAGE_GATE_ENABLED = false;

export function isPriorStageComplete(
  template: ProcessTemplate,
  process: ProjectProcess | null | undefined,
  stageIndex: number,
): boolean {
  if (stageIndex <= 0) {
    return true;
  }

  for (let index = 0; index < stageIndex; index += 1) {
    const stage = template.stages[index];
    if (!stage) {
      continue;
    }
    const items = stage.milestones.flatMap((milestone) => milestone.items);
    if (!items.length) {
      continue;
    }
    const allDone = items.every((item) => Boolean(process?.completions?.[item.id]));
    if (!allDone) {
      return false;
    }
  }

  return true;
}

/**
 * Czy użytkownik może otworzyć element procesu.
 * Odbiór wewnętrzny jest zawsze dostępny — bramka etapów dojdzie później.
 */
export function canOpenProcessItem(
  item: ProcessItem,
  context: {
    stageIndex: number;
    template: ProcessTemplate;
    process?: ProjectProcess | null;
  },
): boolean {
  if (item.isInternalAcceptance) {
    return true;
  }

  if (!PROCESS_STAGE_GATE_ENABLED) {
    return true;
  }

  return isPriorStageComplete(context.template, context.process, context.stageIndex);
}
