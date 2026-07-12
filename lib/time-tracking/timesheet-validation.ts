import type {
  TimeCategory,
  TimeEntryStatus,
  TimeEntryType,
  TimeEntryView,
  TimesheetStatus,
} from "@/lib/time-tracking/types";
import { validateTimeEntryInput } from "@/lib/time-tracking/validation";

export type TimesheetSubmitIssue = {
  entryId: string;
  date: string;
  label: string;
  message: string;
};

const SUBMITTABLE_ENTRY_STATUSES: TimeEntryStatus[] = ["draft", "rejected"];

export function canSubmitTimesheetStatus(status: TimesheetStatus) {
  return status === "draft" || status === "rejected";
}

export function canApproveTimesheetStatus(status: TimesheetStatus) {
  return status === "submitted";
}

export function canRejectTimesheetStatus(status: TimesheetStatus) {
  return status === "submitted";
}

export function collectTimesheetSubmitIssues(
  entries: TimeEntryView[],
  categories: TimeCategory[],
  entryTypes: TimeEntryType[],
): TimesheetSubmitIssue[] {
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const typeMap = new Map(entryTypes.map((item) => [item.id, item]));
  const issues: TimesheetSubmitIssue[] = [];

  for (const entry of entries) {
    if (!SUBMITTABLE_ENTRY_STATUSES.includes(entry.status)) {
      continue;
    }

    const category = categoryMap.get(entry.categoryId);
    const entryType = typeMap.get(entry.entryTypeId);
    if (!category || !entryType) {
      issues.push({
        entryId: entry.id,
        date: entry.date,
        label: `${entry.categoryName} · ${entry.entryTypeName}`,
        message: "Brak konfiguracji kategorii lub typu wpisu.",
      });
      continue;
    }

    const message = validateTimeEntryInput(
      {
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        durationMinutes: entry.durationMinutes,
        breakMinutes: entry.breakMinutes,
        categoryId: entry.categoryId,
        entryTypeId: entry.entryTypeId,
        description: entry.description,
        billable: entry.billable,
        projectId: entry.projectId,
        clientId: entry.clientId,
        workItemId: entry.workItemId,
        serviceId: entry.serviceId,
        remoteWork: entry.remoteWork,
        delegation: entry.delegation,
      },
      category,
      entryType,
    );

    if (message) {
      issues.push({
        entryId: entry.id,
        date: entry.date,
        label: `${entry.categoryName} · ${entry.entryTypeName}`,
        message,
      });
    }
  }

  return issues;
}
