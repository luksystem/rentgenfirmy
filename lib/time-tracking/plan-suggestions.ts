import {
  userEffectiveRangeInItem,
  userHoursInItem,
} from "@/lib/resource-plan/participant-contribution";
import type { ResourcePlanItem } from "@/lib/resource-plan/types";
import { listWorkingDaysInRange } from "@/lib/time-tracking/work-schedule";

export type PlanSuggestionExistingEntry = {
  resourcePlanItemId: string | null;
  date: string;
};

export type PlanTimeSuggestionDraft = {
  key: string;
  resourcePlanItemId: string;
  date: string;
  durationMinutes: number;
  title: string;
  projectId: string | null;
  clientId: string | null;
  processStageId: string | null;
  categoryCode: "project" | "service" | "company";
};

function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

export function intersectDateRanges(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): { from: string; to: string } | null {
  const from = aFrom > bFrom ? aFrom : bFrom;
  const to = aTo < bTo ? aTo : bTo;
  if (from > to) {
    return null;
  }
  return { from, to };
}

export function distributeMinutesAcrossWorkingDays(
  totalMinutes: number,
  dateFrom: string,
  dateTo: string,
): Map<string, number> {
  const result = new Map<string, number>();
  if (totalMinutes <= 0) {
    return result;
  }

  const workingDays = listWorkingDaysInRange(dateFrom, dateTo);
  if (workingDays.length === 0) {
    return result;
  }

  const base = Math.floor(totalMinutes / workingDays.length);
  let remainder = totalMinutes - base * workingDays.length;

  for (const day of workingDays) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) {
      remainder -= 1;
    }
    result.set(day, base + extra);
  }

  return result;
}

export function userAssignedToPlanItem(item: ResourcePlanItem, userId: string): boolean {
  if (item.assigneeId === userId) {
    return true;
  }
  return item.participants.some((participant) => participant.userId === userId);
}

export function resolvePlanItemCategoryCode(
  item: Pick<ResourcePlanItem, "projectId" | "serviceIntakeRequestId">,
): "project" | "service" | "company" {
  if (item.projectId) {
    return "project";
  }
  return "company";
}

export function buildPlanTimeSuggestionDrafts(params: {
  items: ResourcePlanItem[];
  userId: string;
  dateFrom: string;
  dateTo: string;
  existingEntries: PlanSuggestionExistingEntry[];
}): PlanTimeSuggestionDraft[] {
  const covered = new Set(
    params.existingEntries
      .filter((entry) => entry.resourcePlanItemId)
      .map((entry) => `${entry.resourcePlanItemId}:${entry.date}`),
  );

  const drafts: PlanTimeSuggestionDraft[] = [];

  for (const item of params.items) {
    if (!userAssignedToPlanItem(item, params.userId)) {
      continue;
    }

    const userRange = userEffectiveRangeInItem(item, params.userId);
    if (!userRange) {
      continue;
    }

    const range = intersectDateRanges(
      isoToDate(userRange.startAt),
      isoToDate(userRange.endAt),
      params.dateFrom,
      params.dateTo,
    );
    if (!range) {
      continue;
    }

    const totalMinutes = Math.round(userHoursInItem(item, params.userId) * 60);
    const minutesByDate = distributeMinutesAcrossWorkingDays(totalMinutes, range.from, range.to);
    const categoryCode = resolvePlanItemCategoryCode(item);

    for (const [date, durationMinutes] of minutesByDate) {
      if (durationMinutes <= 0) {
        continue;
      }

      const key = `${item.id}:${date}`;
      if (covered.has(key)) {
        continue;
      }

      drafts.push({
        key,
        resourcePlanItemId: item.id,
        date,
        durationMinutes,
        title: item.title,
        projectId: item.projectId,
        clientId: item.clientId,
        processStageId: item.processStageId,
        categoryCode,
      });
    }
  }

  return drafts.sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return left.title.localeCompare(right.title, "pl");
  });
}
