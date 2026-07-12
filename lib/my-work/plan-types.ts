import type { WorkItemView } from "@/lib/my-work/types";

export const WORK_PLAN_PERIOD_TYPES = ["day", "week"] as const;
export type WorkPlanPeriodType = (typeof WORK_PLAN_PERIOD_TYPES)[number];

export const WORK_PLAN_STATUSES = ["draft", "sent", "acknowledged", "active", "closed"] as const;
export type WorkPlanStatus = (typeof WORK_PLAN_STATUSES)[number];

export const WORK_PLAN_STATUS_LABELS: Record<WorkPlanStatus, string> = {
  draft: "Szkic",
  sent: "Wysłany",
  acknowledged: "Potwierdzony",
  active: "Aktywny",
  closed: "Zamknięty",
};

export const WORK_OBSTACLE_TYPES = [
  "materials",
  "documentation",
  "coordination",
  "access",
  "skills",
  "other",
] as const;
export type WorkObstacleType = (typeof WORK_OBSTACLE_TYPES)[number];

export const WORK_OBSTACLE_TYPE_LABELS: Record<WorkObstacleType, string> = {
  materials: "Brak materiałów",
  documentation: "Brak dokumentacji",
  coordination: "Koordynacja / decyzja",
  access: "Brak dostępu",
  skills: "Brak kompetencji",
  other: "Inne",
};

export const WORK_OBSTACLE_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type WorkObstacleSeverity = (typeof WORK_OBSTACLE_SEVERITIES)[number];

export type WorkPlanItemView = {
  id: string;
  workPlanId: string;
  workItemId: string;
  assignedUserId: string;
  plannedDate: string;
  sortOrder: number;
  managerComment: string;
  carriedOver: boolean;
  workItem?: WorkItemView | null;
};

export type WorkPlanView = {
  id: string;
  periodType: WorkPlanPeriodType;
  dateFrom: string;
  dateTo: string;
  assignedUserId: string;
  managerId: string | null;
  status: WorkPlanStatus;
  sentAt: string | null;
  acknowledgedAt: string | null;
  managerComment: string;
  acknowledgementDueAt: string | null;
  items: WorkPlanItemView[];
};

export type WorkDaySession = {
  id: string;
  userId: string;
  sessionDate: string;
  workPlanId: string | null;
  startedAt: string;
  endedAt: string | null;
  startConfirmed: boolean;
  endSubmittedAt: string | null;
};

export type WorkSummaryView = {
  id: string;
  userId: string;
  periodType: "day" | "week";
  dateFrom: string;
  dateTo: string;
  workPlanId: string | null;
  employeeComment: string;
  aiDraft: string;
  submittedAt: string;
};

export type WorkDayContext = {
  sessionDate: string;
  session: WorkDaySession | null;
  dayPlan: WorkPlanView | null;
  summary: WorkSummaryView | null;
};

export type StartDayInput = {
  sessionDate?: string;
  confirmPlan?: boolean;
};

export type EndDayInput = {
  sessionDate?: string;
  employeeComment: string;
  aiDraft?: string;
  carryOverUnfinished?: boolean;
};

export type CreateWeekPlanInput = {
  assignedUserId: string;
  dateFrom: string;
  dateTo: string;
  managerComment?: string;
  items: {
    workItemId: string;
    plannedDate: string;
    sortOrder?: number;
    managerComment?: string;
  }[];
  sendImmediately?: boolean;
};

export type AcknowledgeWeekPlanInput = {
  comment?: string;
  riskNotes?: string;
  acceptedWithoutReservations?: boolean;
};

export type ReportObstacleInput = {
  workItemId?: string | null;
  workPlanId?: string | null;
  projectId?: string | null;
  obstacleType: WorkObstacleType;
  description: string;
  severity?: WorkObstacleSeverity;
};
