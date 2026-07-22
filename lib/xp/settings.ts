/** Ustawienia wymiany punktów XP na premię (`app_settings`). */

export const XP_SETTINGS_ID = "xp_settings";

export type XpSettings = {
  /** Wartość 1 punktu XP w zł — wykorzystywana do wyliczenia sugerowanej kwoty premii. */
  pointWeightPln: number;
  /** Sugerowana maksymalna kwota jednej wymiany — miękka wskazówka w UI, nie blokada. */
  suggestedMaxAmountPln: number;
  /** Sugerowana częstotliwość wymiany — opisowa, nie wymuszana technicznie. */
  suggestedFrequencyLabel: string;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function defaultXpSettings(): XpSettings {
  return {
    pointWeightPln: 0.5,
    suggestedMaxAmountPln: 500,
    suggestedFrequencyLabel: "Kwartalnie",
  };
}

export function normalizeXpSettings(value: unknown): XpSettings {
  const data = asObject(value);
  const defaults = defaultXpSettings();
  return {
    pointWeightPln: asNumber(data.pointWeightPln, defaults.pointWeightPln),
    suggestedMaxAmountPln: asNumber(data.suggestedMaxAmountPln, defaults.suggestedMaxAmountPln),
    suggestedFrequencyLabel:
      typeof data.suggestedFrequencyLabel === "string" && data.suggestedFrequencyLabel.trim()
        ? data.suggestedFrequencyLabel.trim()
        : defaults.suggestedFrequencyLabel,
  };
}
