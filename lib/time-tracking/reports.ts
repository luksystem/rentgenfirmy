import { formatDurationMinutes } from "@/lib/time-tracking/format";
import type { TimeEntryView } from "@/lib/time-tracking/types";

export type WeekCategorySummary = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
};

export type WeekTypeSummary = {
  entryTypeId: string;
  entryTypeName: string;
  totalMinutes: number;
  countsAsWork: boolean;
};

export type WeekTimeReport = {
  totalMinutes: number;
  workMinutes: number;
  absenceMinutes: number;
  billableMinutes: number;
  byCategory: WeekCategorySummary[];
  byType: WeekTypeSummary[];
  entryCount: number;
};

export function buildWeekTimeReport(
  entries: TimeEntryView[],
  entryTypeMeta: Array<{
    id: string;
    name: string;
    countsAsWork: boolean;
    countsAsAbsence: boolean;
  }>,
): WeekTimeReport {
  const typeMeta = new Map(entryTypeMeta.map((item) => [item.id, item]));

  const byCategory = new Map<string, WeekCategorySummary>();
  const byType = new Map<string, WeekTypeSummary>();

  let workMinutes = 0;
  let absenceMinutes = 0;
  let billableMinutes = 0;
  let totalMinutes = 0;

  for (const entry of entries) {
    totalMinutes += entry.durationMinutes;
    if (entry.billable) {
      billableMinutes += entry.durationMinutes;
    }

    const type = typeMeta.get(entry.entryTypeId);
    if (type?.countsAsAbsence) {
      absenceMinutes += entry.durationMinutes;
    } else if (type?.countsAsWork ?? true) {
      workMinutes += entry.durationMinutes;
    }

    const category = byCategory.get(entry.categoryId) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      categoryColor: entry.categoryColor,
      totalMinutes: 0,
    };
    category.totalMinutes += entry.durationMinutes;
    byCategory.set(entry.categoryId, category);

    const entryType = byType.get(entry.entryTypeId) ?? {
      entryTypeId: entry.entryTypeId,
      entryTypeName: entry.entryTypeName,
      totalMinutes: 0,
      countsAsWork: type?.countsAsWork ?? true,
    };
    entryType.totalMinutes += entry.durationMinutes;
    byType.set(entry.entryTypeId, entryType);
  }

  return {
    totalMinutes,
    workMinutes,
    absenceMinutes,
    billableMinutes,
    byCategory: [...byCategory.values()].sort((a, b) => b.totalMinutes - a.totalMinutes),
    byType: [...byType.values()].sort((a, b) => b.totalMinutes - a.totalMinutes),
    entryCount: entries.length,
  };
}

export function formatReportLine(minutes: number): string {
  return formatDurationMinutes(minutes);
}
