export const PROCESS_ITEM_KINDS = ["checklist", "protocol", "settlement"] as const;

export type ProcessItemKind = (typeof PROCESS_ITEM_KINDS)[number];

export type ProcessItem = {
  id: string;
  milestoneId: string;
  kind: ProcessItemKind;
  title: string;
  position: number;
};

export type ProcessMilestone = {
  id: string;
  stageId: string;
  title: string;
  position: number;
  items: ProcessItem[];
};

export type ProcessStage = {
  id: string;
  templateId: string;
  title: string;
  position: number;
  milestones: ProcessMilestone[];
};

export type ProcessTemplate = {
  id: string;
  projectType: string;
  name: string;
  description: string;
  stages: ProcessStage[];
  createdAt: string;
  updatedAt: string;
};

export type ProcessItemCompletion = {
  completedAt: string;
  completedBy?: string;
  note?: string;
};

export type ProjectProcess = {
  id: string;
  projectId: string;
  templateId: string;
  completions: Record<string, ProcessItemCompletion>;
  createdAt: string;
  updatedAt: string;
};

export const PROCESS_ITEM_KIND_LABELS: Record<ProcessItemKind, string> = {
  checklist: "Checklista",
  protocol: "Protokół odbioru",
  settlement: "Rozliczenie",
};

export function countProcessItems(template: ProcessTemplate) {
  return template.stages.reduce(
    (total, stage) =>
      total + stage.milestones.reduce((mTotal, milestone) => mTotal + milestone.items.length, 0),
    0,
  );
}

export function countCompletedItems(template: ProcessTemplate, process: ProjectProcess) {
  const itemIds = new Set<string>();
  template.stages.forEach((stage) =>
    stage.milestones.forEach((milestone) =>
      milestone.items.forEach((item) => itemIds.add(item.id)),
    ),
  );

  return [...itemIds].filter((id) => process.completions[id]).length;
}

export function getProcessProgress(template: ProcessTemplate, process: ProjectProcess) {
  const total = countProcessItems(template);
  const completed = countCompletedItems(template, process);
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function flattenProcessItems(template: ProcessTemplate) {
  return template.stages.flatMap((stage) =>
    stage.milestones.flatMap((milestone) =>
      milestone.items.map((item) => ({
        ...item,
        stageTitle: stage.title,
        milestoneTitle: milestone.title,
      })),
    ),
  );
}
