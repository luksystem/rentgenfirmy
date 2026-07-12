export type TimeEntryStatus = "draft" | "submitted" | "approved" | "rejected" | "locked";

export type TimeEntryCreatedFrom = "manual" | "timer" | "plan" | "mission" | "leave" | "import";

export type TimeCategory = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  defaultBillable: boolean;
  requiresProject: boolean;
};

export type TimeEntryType = {
  id: string;
  name: string;
  countsAsWork: boolean;
  countsAsAbsence: boolean;
  allowsBillable: boolean;
  requiresDescription: boolean;
  requiresProject: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type TimeEntry = {
  id: string;
  userId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  breakMinutes: number;
  categoryId: string;
  entryTypeId: string;
  description: string;
  billable: boolean;
  projectId: string | null;
  clientId: string | null;
  processStageId: string | null;
  workItemId: string | null;
  serviceId: string | null;
  missionId: string | null;
  remoteWork: boolean;
  delegation: boolean;
  overtimeFlag: boolean;
  costRateSnapshot: number | null;
  clientRateSnapshot: number | null;
  status: TimeEntryStatus;
  createdFrom: TimeEntryCreatedFrom;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntryView = TimeEntry & {
  categoryName: string;
  categoryColor: string;
  entryTypeName: string;
  projectName: string | null;
  clientName: string | null;
  workItemTitle: string | null;
};

export type TimeTrackingMeta = {
  categories: TimeCategory[];
  entryTypes: TimeEntryType[];
};

export type TimeEntryFilters = {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  projectId?: string;
  status?: TimeEntryStatus;
};

export type CreateTimeEntryInput = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes: number;
  breakMinutes?: number;
  categoryId: string;
  entryTypeId: string;
  description?: string;
  billable?: boolean;
  projectId?: string | null;
  clientId?: string | null;
  workItemId?: string | null;
  serviceId?: string | null;
  remoteWork?: boolean;
  delegation?: boolean;
  userId?: string;
};

export type UpdateTimeEntryInput = Partial<
  Omit<CreateTimeEntryInput, "userId" | "date"> & { date?: string }
>;

export type ActiveTimer = {
  id: string;
  userId: string;
  startedAt: string;
  date: string;
  categoryId: string;
  entryTypeId: string;
  description: string;
  billable: boolean;
  projectId: string | null;
  clientId: string | null;
  workItemId: string | null;
  serviceId: string | null;
  remoteWork: boolean;
  delegation: boolean;
  breakMinutes: number;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTimerView = ActiveTimer & {
  categoryName: string;
  categoryColor: string;
  entryTypeName: string;
  projectName: string | null;
  workItemTitle: string | null;
  elapsedMinutes: number;
  isLongRunning: boolean;
};

export type StartTimerInput = {
  categoryId: string;
  entryTypeId: string;
  description?: string;
  billable?: boolean;
  projectId?: string | null;
  clientId?: string | null;
  workItemId?: string | null;
  serviceId?: string | null;
  remoteWork?: boolean;
  delegation?: boolean;
  date?: string;
};

export type StopTimerInput = {
  description?: string;
  breakMinutes?: number;
};

export type TimeEntryLog = {
  id: string;
  timeEntryId: string;
  action: string;
  userId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  comment: string;
  createdAt: string;
};

export const TIME_ENTRY_LOG_ACTION_LABELS: Record<string, string> = {
  created: "Utworzono",
  updated: "Zaktualizowano",
  deleted: "Usunięto",
  submitted: "Wysłano",
  approved: "Zaakceptowano",
  rejected: "Odrzucono",
  locked: "Zablokowano",
};

export const TIME_ENTRY_STATUS_LABELS: Record<TimeEntryStatus, string> = {
  draft: "Roboczy",
  submitted: "Wysłany",
  approved: "Zaakceptowany",
  rejected: "Odrzucony",
  locked: "Zablokowany",
};

export function isEditableTimeEntryStatus(status: TimeEntryStatus) {
  return status === "draft" || status === "rejected";
}
