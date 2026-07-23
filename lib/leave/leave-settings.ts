// Metadane wzoru karty urlopowej PDF, trzymane w `app_settings`.
// Ustawienie SMS o urlopach (kiedyś osobny checkbox tutaj) zostało scalone z głównym
// przełącznikiem w /ustawienia/email — patrz lib/leave/leave-sms.ts.

export const LEAVE_CARD_TEMPLATE_SETTINGS_ID = "leave_card_template_settings";

export type LeaveCardTemplateSettings = {
  path: string | null;
  name: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function defaultLeaveCardTemplateSettings(): LeaveCardTemplateSettings {
  return { path: null, name: null };
}

export function normalizeLeaveCardTemplateSettings(value: unknown): LeaveCardTemplateSettings {
  const data = asObject(value);
  return {
    path: typeof data.path === "string" && data.path.trim() ? data.path : null,
    name: typeof data.name === "string" && data.name.trim() ? data.name : null,
  };
}
