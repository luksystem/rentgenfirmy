// Moduł „Moja praca” → Zadania — typy domenowe

export const WORK_ITEM_STATUSES = [
  "draft",
  "planned",
  "sent",
  "pending_ack",
  "accepted",
  "needs_clarification",
  "risk_reported",
  "in_progress",
  "blocked",
  "done",
  "pending_verification",
  "verified",
  "not_done",
  "deferred",
  "cancelled",
] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  draft: "Szkic",
  planned: "Zaplanowane",
  sent: "Wysłane do pracownika",
  pending_ack: "Do zapoznania",
  accepted: "Przyjęte",
  needs_clarification: "Wymaga wyjaśnienia",
  risk_reported: "Zgłoszone zagrożenie",
  in_progress: "W realizacji",
  blocked: "Zablokowane",
  done: "Wykonane",
  pending_verification: "Do weryfikacji",
  verified: "Zaakceptowane przez managera",
  not_done: "Niewykonane",
  deferred: "Przełożone",
  cancelled: "Anulowane",
};

export const TERMINAL_WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "verified",
  "cancelled",
  "not_done",
];

export const WORK_ITEM_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const WORK_ITEM_PRIORITY_LABELS: Record<WorkItemPriority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
  urgent: "Pilny",
};

export const WORK_ITEM_ACCEPTANCE_ACTIONS = [
  "accept",
  "needs_clarification",
  "report_shortage",
  "report_risk",
  "cannot_complete",
  "propose_reschedule",
] as const;

export type WorkItemAcceptanceAction = (typeof WORK_ITEM_ACCEPTANCE_ACTIONS)[number];

export const WORK_ITEM_ACCEPTANCE_ACTION_LABELS: Record<WorkItemAcceptanceAction, string> = {
  accept: "Przyjmuję",
  needs_clarification: "Potrzebuję wyjaśnienia",
  report_shortage: "Zgłaszam brak",
  report_risk: "Zgłaszam zagrożenie",
  cannot_complete: "Nie mogę zrealizować",
  propose_reschedule: "Proponuję zmianę terminu",
};

export const WORK_ITEM_COMPLETE_OUTCOMES = [
  "done",
  "partial",
  "not_done",
  "deferred",
  "blocked",
] as const;

export type WorkItemCompleteOutcome = (typeof WORK_ITEM_COMPLETE_OUTCOMES)[number];

export type WorkItemSourceTypeMeta = {
  code: string;
  label: string;
  moduleLabel: string;
  icon: string;
};

export type WorkItem = {
  id: string;
  sourceType: string;
  sourceId: string | null;
  projectId: string | null;
  clientId: string | null;
  processStageId: string | null;
  assignedUserId: string;
  createdById: string | null;
  managerId: string | null;
  parentWorkItemId: string | null;
  title: string;
  description: string;
  expectedResult: string;
  completionCriteria: string;
  requiredMaterials: string;
  requiredInfo: string;
  dependencies: string[];
  plannedStart: string | null;
  plannedEnd: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  blockedReason: string;
  sentAt: string | null;
  lastAcceptanceAt: string | null;
  acceptedWithoutReservations: boolean;
  completedAt: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  aiGenerated: boolean;
  aiSuggestionReason: string;
  createdAt: string;
  updatedAt: string;
  supportingUserIds: string[];
};

export type WorkItemComment = {
  id: string;
  workItemId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
};

export type WorkItemLog = {
  id: string;
  workItemId: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WorkItemAcceptance = {
  id: string;
  workItemId: string;
  userId: string;
  action: WorkItemAcceptanceAction;
  comment: string;
  dueDateAtAcceptance: string | null;
  acceptedWithoutReservations: boolean;
  createdAt: string;
};

/** Zadanie wzbogacone o kontekst UI (projekt, klient, źródło). */
export type WorkItemView = WorkItem & {
  sourceTypeMeta: WorkItemSourceTypeMeta | null;
  projectName: string | null;
  clientName: string | null;
  stageTitle: string | null;
  managerName: string | null;
  assignedUserName: string | null;
  commentCount: number;
  unreadCommentCount: number;
  sourceLinkUrl: string | null;
  myWorkLinkUrl: string;
  isSupporting: boolean;
};

export type WorkItemDetail = {
  item: WorkItemView;
  comments: WorkItemComment[];
  logs: WorkItemLog[];
  acceptances: WorkItemAcceptance[];
};

export type CreateWorkItemInput = {
  assignedUserId: string;
  projectId?: string | null;
  clientId?: string | null;
  processStageId?: string | null;
  title: string;
  description?: string;
  expectedResult?: string;
  completionCriteria?: string;
  requiredMaterials?: string;
  requiredInfo?: string;
  dueDate?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  estimatedMinutes?: number | null;
  priority?: WorkItemPriority;
  supportingUserIds?: string[];
  sendImmediately?: boolean;
};

export type UpdateWorkItemInput = {
  assignedUserId?: string;
  projectId?: string | null;
  clientId?: string | null;
  processStageId?: string | null;
  title?: string;
  description?: string;
  expectedResult?: string;
  completionCriteria?: string;
  requiredMaterials?: string;
  requiredInfo?: string;
  dueDate?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  estimatedMinutes?: number | null;
  priority?: WorkItemPriority;
  supportingUserIds?: string[];
  status?: WorkItemStatus;
};

export type WorkItemAcceptanceInput = {
  action: WorkItemAcceptanceAction;
  comment?: string;
  acceptedWithoutReservations?: boolean;
  proposedDueDate?: string | null;
};

export type WorkItemCompleteInput = {
  outcome: WorkItemCompleteOutcome;
  comment?: string;
  workDescription?: string;
  continuationNote?: string;
};

export type WorkItemFilters = {
  projectId?: string | null;
  clientId?: string | null;
  status?: WorkItemStatus | null;
  priority?: WorkItemPriority | null;
  sourceType?: string | null;
  overdueOnly?: boolean;
  needsReactionOnly?: boolean;
  ownOnly?: boolean;
  sharedOnly?: boolean;
  aiGeneratedOnly?: boolean;
  assignedUserId?: string | null;
};

export const EMPTY_WORK_ITEM_FILTERS: WorkItemFilters = {
  projectId: null,
  clientId: null,
  status: null,
  priority: null,
  sourceType: null,
  overdueOnly: false,
  needsReactionOnly: false,
  ownOnly: false,
  sharedOnly: false,
  aiGeneratedOnly: false,
  assignedUserId: null,
};

export function workItemLinkUrl(workItemId: string) {
  return `/moja-praca/zadania?item=${workItemId}`;
}

export function isTerminalWorkItemStatus(status: WorkItemStatus) {
  return TERMINAL_WORK_ITEM_STATUSES.includes(status);
}

export function acceptanceActionToStatus(action: WorkItemAcceptanceAction): WorkItemStatus {
  switch (action) {
    case "accept":
      return "accepted";
    case "needs_clarification":
      return "needs_clarification";
    case "report_shortage":
    case "report_risk":
      return "risk_reported";
    case "cannot_complete":
      return "not_done";
    case "propose_reschedule":
      return "needs_clarification";
    default:
      return "pending_ack";
  }
}

export function completeOutcomeToStatus(outcome: WorkItemCompleteOutcome): WorkItemStatus {
  switch (outcome) {
    case "done":
      return "pending_verification";
    case "partial":
      return "in_progress";
    case "not_done":
      return "not_done";
    case "deferred":
      return "deferred";
    case "blocked":
      return "blocked";
    default:
      return "in_progress";
  }
}
