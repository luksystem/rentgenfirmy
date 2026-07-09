export const GOAL_LEVELS = ["company", "team", "individual"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const GOAL_LEVEL_LABELS: Record<GoalLevel, string> = {
  company: "Firma",
  team: "Zespół",
  individual: "Osoba",
};

export const GOAL_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
  critical: "Krytyczny",
};

// Kolumny tablicy = statusy (decyzja D2, docs/cele/mvp/ARCHITEKTURA.md)
export const GOAL_STATUSES = [
  "planned",
  "in_progress",
  "at_risk",
  "on_hold",
  "settled",
  "cancelled",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_BOARD_COLUMNS: GoalStatus[] = [
  "planned",
  "in_progress",
  "at_risk",
  "on_hold",
  "settled",
];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  planned: "Planowanie",
  in_progress: "W realizacji",
  at_risk: "Zagrożony",
  on_hold: "Wstrzymany",
  settled: "Rozliczony",
  cancelled: "Anulowany",
};

export const GOAL_PERIOD_TYPES = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;
export type GoalPeriodType = (typeof GOAL_PERIOD_TYPES)[number];

export const GOAL_PERIOD_TYPE_LABELS: Record<GoalPeriodType, string> = {
  daily: "Dzienny",
  weekly: "Tygodniowy",
  monthly: "Miesięczny",
  quarterly: "Kwartalny",
  annual: "Roczny",
};

export const GOAL_SETTLEMENT_STATUSES = ["achieved", "partially_achieved", "not_achieved"] as const;
export type GoalSettlementStatus = (typeof GOAL_SETTLEMENT_STATUSES)[number];

export const GOAL_SETTLEMENT_STATUS_LABELS: Record<GoalSettlementStatus, string> = {
  achieved: "Osiągnięty",
  partially_achieved: "Częściowo osiągnięty",
  not_achieved: "Nieosiągnięty",
};

export const GOAL_PARTICIPANT_ROLES = ["contributor", "reviewer"] as const;
export type GoalParticipantRole = (typeof GOAL_PARTICIPANT_ROLES)[number];

export const GOAL_LINK_TYPES = ["kanban_task", "problem", "document"] as const;
export type GoalLinkType = (typeof GOAL_LINK_TYPES)[number];

export const GOAL_INITIATIVE_KINDS = ["initiative", "task", "resource", "budget"] as const;
export type GoalInitiativeKind = (typeof GOAL_INITIATIVE_KINDS)[number];

export const GOAL_INITIATIVE_KIND_LABELS: Record<GoalInitiativeKind, string> = {
  initiative: "Inicjatywa",
  task: "Zadanie",
  resource: "Zasób",
  budget: "Budżet",
};

export const GOAL_INITIATIVE_STATUSES = ["proposed", "accepted", "rejected", "converted"] as const;
export type GoalInitiativeStatus = (typeof GOAL_INITIATIVE_STATUSES)[number];

export const GOAL_REVIEW_OUTCOMES = ["on_track", "at_risk", "off_track"] as const;
export type GoalReviewOutcome = (typeof GOAL_REVIEW_OUTCOMES)[number];

export const GOAL_REVIEW_OUTCOME_LABELS: Record<GoalReviewOutcome, string> = {
  on_track: "Zgodnie z planem",
  at_risk: "Zagrożony",
  off_track: "Poza planem",
};

export const GOAL_BOARD_KIND_VISIBILITIES = ["all", "admin_only"] as const;
export type GoalBoardKindVisibility = (typeof GOAL_BOARD_KIND_VISIBILITIES)[number];

export type GoalBoardKind = {
  code: string;
  label: string;
  description: string;
  icon: string;
  visibility: GoalBoardKindVisibility;
  sortOrder: number;
  isActive: boolean;
};

export type GoalBoard = {
  id: string;
  kind: string;
  name: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalMethodology = {
  code: string;
  name: string;
  shortDescription: string;
  purpose: string;
  whenToUse: string;
  whenNotToUse: string;
  structureMd: string;
  exampleMd: string;
  bestPracticesMd: string;
  commonMistakesMd: string;
  fieldSchema: GoalMethodologyFieldSchema[];
  schemaVersion: number;
  isActive: boolean;
  sortOrder: number;
};

export type GoalMethodologyFieldSchema = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "list";
  helpText?: string;
};

export type GoalParticipant = {
  goalId: string;
  profileId: string;
  role: GoalParticipantRole;
  profileName?: string;
};

export type GoalKpi = {
  id: string;
  goalId: string;
  name: string;
  unit: string;
  targetValue: number | null;
  currentValue: number;
  source: "manual" | "system";
  position: number;
};

export type GoalUpdateEntry = {
  id: string;
  goalId: string;
  authorId: string | null;
  authorName?: string | null;
  previousProgress: number | null;
  newProgress: number | null;
  previousStatus: GoalStatus | null;
  newStatus: GoalStatus | null;
  note: string | null;
  createdAt: string;
};

export type GoalComment = {
  id: string;
  goalId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

export type GoalReview = {
  id: string;
  goalId: string;
  scheduledAt: string;
  requiresAction: boolean;
  completedAt: string | null;
  closedBy: string | null;
  outcome: GoalReviewOutcome | null;
  progressSnapshot: number | null;
  note: string | null;
  createdAt: string;
};

export type GoalInitiative = {
  id: string;
  goalId: string;
  kind: GoalInitiativeKind;
  title: string;
  description: string;
  estimatedValue: number | null;
  estimatedUnit: string | null;
  status: GoalInitiativeStatus;
  convertedTaskId: string | null;
  source: "ai" | "manual";
  createdAt: string;
};

export type GoalLink = {
  id: string;
  goalId: string;
  linkedType: GoalLinkType;
  linkedId: string;
  createdAt: string;
};

export type GoalAiSuggestion = {
  id: string;
  goalId: string | null;
  trigger: "create" | "review" | "manual";
  inputDescription: string;
  suggestedMethodologyCode: string | null;
  justification: string | null;
  alternatives: Array<{ code: string; whenBetter: string }>;
  structure: GoalAiSuggestedStructure;
  vagueWarning: string | null;
  accepted: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type GoalAiSuggestedStructure = {
  fields: Record<string, string>;
  kpis: Array<{ name: string; target: number; unit: string }>;
  monitoringApproach: string;
  reviewFrequency: GoalPeriodType;
  risks: string[];
  initiatives: string[];
  tasks: string[];
  resources: string[];
  budgetEstimate: { amount: number; currency: string; note: string };
};

export type Goal = {
  id: string;
  boardId: string;
  level: GoalLevel;
  name: string;
  description: string;
  ownerId: string | null;
  ownerName?: string | null;

  priority: GoalPriority;
  status: GoalStatus;

  periodType: GoalPeriodType;
  periodStart: string;
  periodEnd: string;

  progressPercent: number;

  methodologyId: string | null;
  methodologyFields: Record<string, unknown>;

  isRecurring: boolean;
  recurrenceParentId: string | null;
  recurrenceRootId: string | null;

  parentGoalId: string | null;

  projectId: string | null;
  clientId: string | null;
  processStageId: string | null;
  processMilestoneId: string | null;

  settlementStatus: GoalSettlementStatus | null;
  settlementWhatWorked: string | null;
  settlementWhatFailed: string | null;
  settlementConclusions: string | null;
  settledAt: string | null;
  settledBy: string | null;

  createdBy: string | null;
  createdAt: string;
  updatedAt: string;

  // dane pomocnicze do kart/dashboardu (dociągane batch, nie N+1)
  participants?: GoalParticipant[];
  kpis?: GoalKpi[];
  linkedTaskCount?: number;
  openProblemCount?: number;
  nextReviewAt?: string | null;
};

export type GoalInput = Omit<
  Goal,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "participants"
  | "kpis"
  | "linkedTaskCount"
  | "openProblemCount"
  | "nextReviewAt"
>;

export function isGoalOverdue(goal: Pick<Goal, "periodEnd" | "status">) {
  if (goal.status === "settled" || goal.status === "cancelled") {
    return false;
  }
  return new Date(goal.periodEnd).getTime() < Date.now();
}

export function computeNextPeriod(
  periodType: GoalPeriodType,
  currentEnd: string,
): { periodStart: string; periodEnd: string } {
  const start = new Date(currentEnd);
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  switch (periodType) {
    case "daily":
      break;
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
    case "annual":
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      break;
  }

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}
