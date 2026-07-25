// Drobne pomocnicze funkcje dat współdzielone przez panel obłożenia i asystenta planowania.

import type { ResourcePlanItem } from "@/lib/resource-plan/types";

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function itemHours(item: Pick<ResourcePlanItem, "plannedHours" | "startAt" | "endAt">): number {
  if (item.plannedHours != null) return item.plannedHours;
  return Math.max(0, (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 3_600_000);
}

/** Klucze dni (yyyy-mm-dd) w kalendarzowym zakresie [startAt, endAt] elementu planu — używane do
 *  równomiernego rozłożenia godzin elementu na dni, które obejmuje. */
export function itemDayKeys(item: Pick<ResourcePlanItem, "startAt" | "endAt">): string[] {
  const start = startOfDay(new Date(item.startAt));
  const end = startOfDay(new Date(item.endAt));
  const keys: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    keys.push(toDateKey(cursor));
  }
  return keys.length > 0 ? keys : [toDateKey(start)];
}
