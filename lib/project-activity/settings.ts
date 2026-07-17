/** Ustawienia automatycznego wykrywania aktywnych projektów (`app_settings`). */

export const PROJECT_ACTIVITY_SETTINGS_ID = "project_activity_settings";

/** Aktywność w tym oknie → projekt powinien być aktywny. */
export const DEFAULT_ACTIVATE_WITHIN_DAYS = 30;

/**
 * Brak aktywności przez tyle dni → projekt może spaść do nieaktywnego.
 * Pasek między activate a deactivate to histereza (bez skakania).
 */
export const DEFAULT_DEACTIVATE_AFTER_DAYS = 45;

export type ProjectActivitySettings = {
  autoDetectActiveProjects: boolean;
  activateWithinDays: number;
  deactivateAfterDays: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clampDays(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(180, Math.max(7, Math.round(n)));
}

export function defaultProjectActivitySettings(): ProjectActivitySettings {
  return {
    autoDetectActiveProjects: false,
    activateWithinDays: DEFAULT_ACTIVATE_WITHIN_DAYS,
    deactivateAfterDays: DEFAULT_DEACTIVATE_AFTER_DAYS,
  };
}

export function normalizeProjectActivitySettings(value: unknown): ProjectActivitySettings {
  const data = asObject(value);
  const activateWithinDays = clampDays(data.activateWithinDays, DEFAULT_ACTIVATE_WITHIN_DAYS);
  const deactivateAfterDays = Math.max(
    activateWithinDays,
    clampDays(data.deactivateAfterDays, DEFAULT_DEACTIVATE_AFTER_DAYS),
  );

  return {
    autoDetectActiveProjects: data.autoDetectActiveProjects === true,
    activateWithinDays,
    deactivateAfterDays,
  };
}
