// Ustawienia modułu "Tablice celów", trzymane w `app_settings` (jak filtry widoku projektów) —
// jedna opcja: czy pickery projektu w module celów mają pokazywać tylko aktywne projekty czy wszystkie.

export const GOALS_MODULE_SETTINGS_ID = "goals_module_settings";

export type GoalProjectScope = "active" | "all";

export type GoalModuleSettings = {
  projectScope: GoalProjectScope;
};

export function defaultGoalModuleSettings(): GoalModuleSettings {
  return { projectScope: "active" };
}

export function normalizeGoalModuleSettings(value: unknown): GoalModuleSettings {
  const data = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    projectScope: data.projectScope === "all" ? "all" : "active",
  };
}
