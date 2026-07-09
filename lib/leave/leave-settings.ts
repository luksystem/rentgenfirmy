// Ustawienia modułu "Moja praca" → Dostępność, trzymane w `app_settings` (jak reguły SMS) —
// jeden checkbox włączający SMS o urlopach + metadane wzoru karty urlopowej PDF.

export const LEAVE_NOTIFICATIONS_SETTINGS_ID = "leave_notifications_settings";
export const LEAVE_CARD_TEMPLATE_SETTINGS_ID = "leave_card_template_settings";

export type LeaveNotificationsSettings = {
  smsEnabled: boolean;
};

export type LeaveCardTemplateSettings = {
  path: string | null;
  name: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function defaultLeaveNotificationsSettings(): LeaveNotificationsSettings {
  return { smsEnabled: false };
}

export function normalizeLeaveNotificationsSettings(value: unknown): LeaveNotificationsSettings {
  const data = asObject(value);
  return { smsEnabled: data.smsEnabled === true };
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
