import type { InspectionFrequency } from "@/lib/inspections/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultMonthsForFrequency(frequency: InspectionFrequency): number[] {
  switch (frequency) {
    case "monthly":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case "quarterly":
      return [3, 6, 9, 12];
    case "semi_annual":
      return [6, 12];
    case "annual":
      return [12];
    default:
      return [3, 6, 9, 12];
  }
}

/** Domyślna wstępna data: 15. dnia wybranego miesiąca w danym roku. */
export function preliminaryDateForMonth(year: number, month: number): string {
  const safeMonth = Math.min(12, Math.max(1, month));
  const date = new Date(Date.UTC(year, safeMonth - 1, 15));
  return date.toISOString().slice(0, 10);
}

export function generateUpcomingPreliminaryDates(input: {
  months: number[];
  horizonMonths?: number;
  from?: Date;
}): string[] {
  const from = input.from ?? new Date();
  const horizonMonths = input.horizonMonths ?? 12;
  const end = new Date(from.getTime() + horizonMonths * 30 * DAY_MS);
  const dates: string[] = [];

  for (let year = from.getFullYear(); year <= end.getFullYear() + 1; year += 1) {
    for (const month of input.months) {
      const candidate = preliminaryDateForMonth(year, month);
      const candidateDate = new Date(`${candidate}T12:00:00`);
      if (candidateDate >= from && candidateDate <= end) {
        dates.push(candidate);
      }
    }
  }

  return [...new Set(dates)].sort();
}

export function isInspectionPlanningDue(input: {
  preliminaryDate: string | null;
  confirmedDate: string | null;
  status: string;
  leadDays?: number;
}): boolean {
  if (input.status !== "preliminary" || !input.preliminaryDate || input.confirmedDate) {
    return false;
  }

  const leadDays = input.leadDays ?? 21;
  const dueAt = new Date(`${input.preliminaryDate}T12:00:00`).getTime() - leadDays * DAY_MS;
  return Date.now() >= dueAt;
}

/** Termin wstępny minął, a konkretna data wizyty nadal nieustawiona. */
export function isInspectionPlanningOverdue(input: {
  preliminaryDate: string | null;
  confirmedDate: string | null;
  status: string;
}): boolean {
  if (input.status !== "preliminary" || !input.preliminaryDate || input.confirmedDate) {
    return false;
  }

  return Date.now() > new Date(`${input.preliminaryDate}T12:00:00`).getTime();
}
