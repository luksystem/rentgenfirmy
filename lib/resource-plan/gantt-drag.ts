// Etap 4 (rozszerzenie) modułu Plan Zasobów — logika przeciągania/rozciągania
// bloków w widoku Gantta. Snapowanie do pełnych dni, zachowanie godziny startu/końca.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const GANTT_DAY_WIDTH_PX = 40;
export const GANTT_ROW_LANE_HEIGHT_PX = 34;
export const GANTT_DRAG_THRESHOLD_PX = 4;
export const GANTT_MIN_DURATION_MS = 30 * 60_000;

export type GanttDragMode = "move" | "resize-start" | "resize-end";

export function shiftIsoByDays(iso: string, deltaDays: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString();
}

/** Przesunięcie w pikselach elementu o zadanej dacie względem początku widocznego miesiąca. */
export function dayOffsetPx(monthStart: Date, iso: string, dayWidthPx: number): number {
  const ms = new Date(iso).getTime() - monthStart.getTime();
  return (ms / MS_PER_DAY) * dayWidthPx;
}

export function applyGanttDrag(params: {
  mode: GanttDragMode;
  originalStartAt: string;
  originalEndAt: string;
  deltaDays: number;
}): { startAt: string; endAt: string } {
  const { mode, originalStartAt, originalEndAt, deltaDays } = params;
  if (deltaDays === 0) {
    return { startAt: originalStartAt, endAt: originalEndAt };
  }

  if (mode === "move") {
    return {
      startAt: shiftIsoByDays(originalStartAt, deltaDays),
      endAt: shiftIsoByDays(originalEndAt, deltaDays),
    };
  }

  const originalEndMs = new Date(originalEndAt).getTime();
  const originalStartMs = new Date(originalStartAt).getTime();

  if (mode === "resize-start") {
    const nextStartMs = new Date(shiftIsoByDays(originalStartAt, deltaDays)).getTime();
    const clampedStartMs = Math.min(nextStartMs, originalEndMs - GANTT_MIN_DURATION_MS);
    return { startAt: new Date(clampedStartMs).toISOString(), endAt: originalEndAt };
  }

  const nextEndMs = new Date(shiftIsoByDays(originalEndAt, deltaDays)).getTime();
  const clampedEndMs = Math.max(nextEndMs, originalStartMs + GANTT_MIN_DURATION_MS);
  return { startAt: originalStartAt, endAt: new Date(clampedEndMs).toISOString() };
}

/**
 * Przydział elementów do "torów" (lanes) w ramach jednego wiersza, tak by nakładające się
 * czasowo elementy renderowały się jedno pod drugim, a nie jedno na drugim — czyni konflikty
 * widoczne na pierwszy rzut oka, zamiast wymagać kliknięcia w każdy blok.
 */
export function assignGanttLanes<T extends { id: string; startAt: string; endAt: string }>(
  items: T[],
): { laneById: Map<string, number>; laneCount: number } {
  const sorted = [...items].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const laneEndTimes: number[] = [];
  const laneById = new Map<string, number>();

  sorted.forEach((item) => {
    const startMs = new Date(item.startAt).getTime();
    let laneIndex = laneEndTimes.findIndex((endMs) => endMs <= startMs);
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(0);
    }
    laneEndTimes[laneIndex] = new Date(item.endAt).getTime();
    laneById.set(item.id, laneIndex);
  });

  return { laneById, laneCount: Math.max(1, laneEndTimes.length) };
}
