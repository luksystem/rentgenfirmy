// Ustawienia modułu "Tablice celów", trzymane w `app_settings` (jak filtry widoku projektów).

export const GOALS_MODULE_SETTINGS_ID = "goals_module_settings";

export type GoalProjectScope = "active" | "all";

export type GoalReviewOutcomeOption = {
  id: string;
  label: string;
};

export type GoalModuleSettings = {
  projectScope: GoalProjectScope;
  /** Opcje pola „Wynik przeglądu względem kryteriów”. */
  reviewOutcomes: GoalReviewOutcomeOption[];
};

export const DEFAULT_GOAL_REVIEW_OUTCOME_OPTIONS: GoalReviewOutcomeOption[] = [
  { id: "on_track", label: "Zgodnie z planem" },
  { id: "at_risk", label: "Zagrożony" },
  { id: "off_track", label: "Poza planem" },
];

export function defaultGoalModuleSettings(): GoalModuleSettings {
  return {
    projectScope: "active",
    reviewOutcomes: DEFAULT_GOAL_REVIEW_OUTCOME_OPTIONS.map((entry) => ({ ...entry })),
  };
}

export function slugifyReviewOutcomeId(label: string, existingIds: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "outcome";

  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function normalizeReviewOutcomeOptions(value: unknown): GoalReviewOutcomeOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_GOAL_REVIEW_OUTCOME_OPTIONS.map((entry) => ({ ...entry }));
  }

  const seen = new Set<string>();
  const options: GoalReviewOutcomeOption[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;

    let id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id) {
      id = slugifyReviewOutcomeId(label, seen);
    }
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label });
  }

  return options.length > 0
    ? options
    : DEFAULT_GOAL_REVIEW_OUTCOME_OPTIONS.map((entry) => ({ ...entry }));
}

export function resolveReviewOutcomeLabel(
  outcomeId: string | null | undefined,
  options?: GoalReviewOutcomeOption[] | null,
): string {
  if (!outcomeId) return "—";
  const list = options?.length ? options : DEFAULT_GOAL_REVIEW_OUTCOME_OPTIONS;
  return list.find((entry) => entry.id === outcomeId)?.label ?? outcomeId;
}

export function normalizeGoalModuleSettings(value: unknown): GoalModuleSettings {
  const data =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    projectScope: data.projectScope === "all" ? "all" : "active",
    reviewOutcomes: normalizeReviewOutcomeOptions(data.reviewOutcomes),
  };
}
