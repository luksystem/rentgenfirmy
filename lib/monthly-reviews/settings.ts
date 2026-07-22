/** Ustawienia widoczności oceny przełożonego dla pracownika (`app_settings`). */

export const MONTHLY_REVIEW_SETTINGS_ID = "monthly_review_settings";

export type MonthlyReviewSettings = {
  /** Czy pracownik widzi ocenę (ocena liczbowa + komentarz) wystawioną przez przełożonego, gdy obie oceny są już złożone. */
  employeeCanSeeManagerAssessment: boolean;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function defaultMonthlyReviewSettings(): MonthlyReviewSettings {
  return {
    employeeCanSeeManagerAssessment: false,
  };
}

export function normalizeMonthlyReviewSettings(value: unknown): MonthlyReviewSettings {
  const data = asObject(value);
  return {
    employeeCanSeeManagerAssessment: data.employeeCanSeeManagerAssessment === true,
  };
}
