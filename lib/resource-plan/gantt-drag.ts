// Etap 4 (rozszerzenie) modułu Plan Zasobów — logika przeciągania/rozciągania
// bloków w widoku Gantta. Snapowanie do pełnych dni, zachowanie godziny startu/końca.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const GANTT_DAY_WIDTH_PX = 40;
export const GANTT_ROW_LANE_HEIGHT_PX = 34;
export const GANTT_DRAG_THRESHOLD_PX = 4;
export const GANTT_MIN_DURATION_MS = 30 * 60_000;

export type GanttDragMode = "move" | "resize-start" | "resize-end";

export type GanttZoom = "month" | "quarter" | "year";

/** Szerokość kolumny dnia w pikselach zależnie od poziomu przybliżenia. */
export const GANTT_ZOOM_DAY_WIDTH_PX: Record<GanttZoom, number> = {
  month: GANTT_DAY_WIDTH_PX,
  quarter: 14,
  year: 5,
};

/**
 * Granularność snapowania przeciągania (w dniach) zależna od zoomu — przy widoku kwartalnym/
 * rocznym kolumny dnia są za wąskie, by precyzyjnie chwycić konkretny dzień, więc przeciąganie
 * "przeskakuje" tydzień/miesiąc naraz. Dokładna korekta w dniach jest wciąż możliwa w widoku
 * miesięcznym.
 */
export const GANTT_ZOOM_SNAP_DAYS: Record<GanttZoom, number> = {
  month: 1,
  quarter: 7,
  year: 30,
};

/** Zakres dat (początek/koniec, wyłącznie) dla danego poziomu zoomu i przesunięcia okresu. */
export function getGanttPeriodRange(zoom: GanttZoom, periodOffset: number): { start: Date; end: Date } {
  const now = new Date();
  if (zoom === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end };
  }
  if (zoom === "quarter") {
    const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), currentQuarterStartMonth + periodOffset * 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 1);
    return { start, end };
  }
  const start = new Date(now.getFullYear() + periodOffset, 0, 1);
  const end = new Date(start.getFullYear() + 1, 0, 1);
  return { start, end };
}

/** Etykieta bieżącego okresu do wyświetlenia w nawigacji nad Ganttem. */
export function formatGanttPeriodLabel(zoom: GanttZoom, start: Date): string {
  if (zoom === "month") {
    return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(start);
  }
  if (zoom === "quarter") {
    const quarterNumber = Math.floor(start.getMonth() / 3) + 1;
    return `${quarterNumber}. kwartał ${start.getFullYear()}`;
  }
  return String(start.getFullYear());
}

/** Grupuje kolumny dni po miesiącu — używane w nagłówku widoku kwartalnego/rocznego, gdzie
 *  poszczególne dni są za wąskie, by pokazać numer dnia, więc nagłówek pokazuje nazwy miesięcy. */
export function groupGanttDaysByMonth(days: Date[]): { label: string; count: number }[] {
  const groups: { label: string; count: number }[] = [];
  days.forEach((day) => {
    const label = new Intl.DateTimeFormat("pl-PL", { month: "short", year: "numeric" }).format(day);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.count += 1;
    } else {
      groups.push({ label, count: 1 });
    }
  });
  return groups;
}

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
 * Rozpoznaje wiersz (osoba/zespół/projekt) znajdujący się wizualnie pod kursorem — używane przy
 * przeciąganiu kafelka między wierszami. Element przeciągany trzeba wykluczyć z testu trafień
 * (tymczasowo `pointer-events: none`), bo inaczej `elementFromPoint` zwróci sam kafelek, a nie
 * wiersz, który jest pod nim wizualnie (kafelek jedzie razem z kursorem przez CSS transform,
 * więc jego pozycja w DOM się nie zmienia).
 */
export function resolveGanttRowId(clientX: number, clientY: number, excludeElement: HTMLElement | null): string | null {
  const previousPointerEvents = excludeElement?.style.pointerEvents;
  if (excludeElement) excludeElement.style.pointerEvents = "none";
  const target = document.elementFromPoint(clientX, clientY);
  if (excludeElement) excludeElement.style.pointerEvents = previousPointerEvents ?? "";
  return target?.closest("[data-gantt-row-id]")?.getAttribute("data-gantt-row-id") ?? null;
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
