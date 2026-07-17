import type { ProjectActivitySettings } from "@/lib/project-activity/settings";

/**
 * Histereza aktywności projektu:
 * - aktywność ≤ activateWithinDays → aktywny
 * - brak aktywności ≥ deactivateAfterDays → nieaktywny
 * - w międzyczasie → bez zmian (unikamy skakania)
 * - zamknięty → zawsze nieaktywny przy auto-wykrywaniu
 */
export function computeDesiredIsActive(input: {
  currentlyActive: boolean;
  isClosed: boolean;
  lastActivityAt: string | null;
  settings: Pick<ProjectActivitySettings, "activateWithinDays" | "deactivateAfterDays">;
  now?: Date;
}): boolean | null {
  if (input.isClosed) {
    return input.currentlyActive ? false : null;
  }

  const now = input.now ?? new Date();
  const activityMs = input.lastActivityAt ? Date.parse(input.lastActivityAt) : NaN;
  const hasActivity = Number.isFinite(activityMs);

  if (!hasActivity) {
    return input.currentlyActive ? false : null;
  }

  const ageDays = Math.floor((now.getTime() - activityMs) / (1000 * 60 * 60 * 24));

  if (ageDays <= input.settings.activateWithinDays) {
    return input.currentlyActive ? null : true;
  }

  if (ageDays >= input.settings.deactivateAfterDays) {
    return input.currentlyActive ? false : null;
  }

  return null;
}

export function maxIsoTimestamp(values: Array<string | null | undefined>): string | null {
  let bestMs = 0;
  let best: string | null = null;
  for (const value of values) {
    if (!value) {
      continue;
    }
    const ms = Date.parse(value);
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = value;
    }
  }
  return best;
}
