import type { ProcessItem, ProcessTemplate } from "@/lib/process/types";

export function findProcessItemInTemplate(
  template: ProcessTemplate | undefined,
  templateItemId: string,
): ProcessItem | undefined {
  if (!template) {
    return undefined;
  }

  for (const stage of template.stages) {
    for (const milestone of stage.milestones) {
      for (const item of milestone.items) {
        if (item.id === templateItemId) {
          return item;
        }
      }
    }
  }

  return undefined;
}
