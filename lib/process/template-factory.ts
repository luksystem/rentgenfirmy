import {
  countSeedIds,
  DEFAULT_PROCESS_TEMPLATE_SEEDS,
  instantiateTemplateFromSeed,
} from "@/lib/process/default-templates";
import type { ProcessItemKind, ProcessTemplate } from "@/lib/process/types";

function createIds(count: number) {
  return Array.from({ length: count }, () => crypto.randomUUID());
}

function buildStarterTemplate(projectType: string): ProcessTemplate {
  const templateId = crypto.randomUUID();
  const stageId = crypto.randomUUID();
  const milestoneId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id: templateId,
    projectType,
    name: `Proces — ${projectType}`,
    description: `Szablon procesu dla typu projektu ${projectType}.`,
    createdAt: now,
    updatedAt: now,
    stages: [
      {
        id: stageId,
        templateId,
        title: "Etap 1",
        position: 0,
        milestones: [
          {
            id: milestoneId,
            stageId,
            title: "Start",
            position: 0,
            plannedDate: null,
            items: [
              {
                id: itemId,
                milestoneId,
                kind: "checklist" as ProcessItemKind,
                title: "Pierwszy krok",
                position: 0,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function buildTemplateForProjectType(projectType: string): ProcessTemplate {
  const seed = DEFAULT_PROCESS_TEMPLATE_SEEDS.find((entry) => entry.projectType === projectType);

  if (seed) {
    const counts = countSeedIds(seed);
    return instantiateTemplateFromSeed(seed, {
      templateId: crypto.randomUUID(),
      stageIds: createIds(counts.stageCount),
      milestoneIds: createIds(counts.milestoneCount),
      itemIds: createIds(counts.itemCount),
    });
  }

  return buildStarterTemplate(projectType);
}
