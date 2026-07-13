export type TaskChecklistItem = {
  id: string;
  workItemId: string | null;
  resourcePlanItemId: string | null;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
  sortOrder: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskChecklistParent =
  | { kind: "work_item"; id: string }
  | { kind: "resource_plan_item"; id: string };

export type CreateTaskChecklistItemInput = {
  parent: TaskChecklistParent;
  title: string;
};

export type UpdateTaskChecklistItemInput = {
  title?: string;
  isCompleted?: boolean;
};
