export function timeStringToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export type TimeRange = {
  startMinutes: number;
  endMinutes: number;
};

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function entryToRange(
  startTime: string | null,
  endTime: string | null,
): TimeRange | null {
  if (!startTime || !endTime) {
    return null;
  }
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  if (endMinutes <= startMinutes) {
    return null;
  }
  return { startMinutes, endMinutes };
}

export function findOverlapMessage(
  candidate: TimeRange,
  existing: Array<{ id: string; startTime: string | null; endTime: string | null }>,
  excludeId?: string,
): string | null {
  for (const entry of existing) {
    if (excludeId && entry.id === excludeId) {
      continue;
    }
    const range = entryToRange(entry.startTime, entry.endTime);
    if (range && rangesOverlap(candidate, range)) {
      return "Ten przedział czasu nakłada się na inny wpis tego dnia.";
    }
  }
  return null;
}

export const LONG_TIMER_WARNING_MINUTES = 10 * 60;
