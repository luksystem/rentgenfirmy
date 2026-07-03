import { getTemplateVariableKeysForTrigger } from "@/lib/messages/template-variables";

export const SMS_RULE_TRIGGERS = ["client_created", "user_created"] as const;

export type SmsRuleTrigger = (typeof SMS_RULE_TRIGGERS)[number];

export type SmsRule = {
  id: string;
  trigger: SmsRuleTrigger;
  label: string;
  description: string;
  enabled: boolean;
  messageTemplate: string;
};

export type SmsRulesSettings = {
  rules: SmsRule[];
};

export const SMS_RULE_TRIGGER_LABELS: Record<SmsRuleTrigger, string> = {
  client_created: "Nowy klient w bazie Klientów",
  user_created: "Nowy użytkownik w aplikacji",
};

export const SMS_RULE_VARIABLES: Record<SmsRuleTrigger, string[]> = {
  client_created: getTemplateVariableKeysForTrigger("client_created"),
  user_created: getTemplateVariableKeysForTrigger("user_created"),
};

export const DEFAULT_SMS_RULES: SmsRule[] = [
  {
    id: "client_created_welcome",
    trigger: "client_created",
    label: "Powitanie nowego klienta",
    description:
      "SMS na numer telefonu klienta wysyłany jednorazowo w momencie dodania nowego rekordu do bazy Klientów (nie przy edycji).",
    enabled: false,
    messageTemplate: "WITAJ w Rentgenie Luksystem.",
  },
  {
    id: "user_created_welcome",
    trigger: "user_created",
    label: "Powitanie nowego użytkownika",
    description:
      "SMS na numer telefonu użytkownika wysyłany jednorazowo w momencie utworzenia konta przez administratora (nie przy edycji profilu).",
    enabled: false,
    messageTemplate:
      "Witaj {{firstName}}! Utworzyliśmy dla Ciebie konto w aplikacji Rentgen Luksystem.",
  },
];

export function defaultSmsRulesSettings(): SmsRulesSettings {
  return {
    rules: DEFAULT_SMS_RULES.map((rule) => ({ ...rule })),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeRule(value: unknown, index: number): SmsRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const trigger = row.trigger;
  if (typeof trigger !== "string" || !SMS_RULE_TRIGGERS.includes(trigger as SmsRuleTrigger)) {
    return null;
  }

  const fallback = DEFAULT_SMS_RULES[index] ?? DEFAULT_SMS_RULES[0];

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : fallback.id,
    trigger: trigger as SmsRuleTrigger,
    label: typeof row.label === "string" && row.label.trim() ? row.label : fallback.label,
    description:
      typeof row.description === "string" ? row.description : fallback.description,
    enabled: row.enabled === true,
    messageTemplate:
      typeof row.messageTemplate === "string" && row.messageTemplate.trim()
        ? row.messageTemplate
        : fallback.messageTemplate,
  };
}

export function normalizeSmsRulesSettings(value: unknown): SmsRulesSettings {
  const data = asObject(value);
  const rawRules = Array.isArray(data.rules) ? data.rules : [];

  if (rawRules.length === 0) {
    return defaultSmsRulesSettings();
  }

  const rules = rawRules
    .map((entry, index) => normalizeRule(entry, index))
    .filter((rule): rule is SmsRule => rule !== null);

  const knownIds = new Set(rules.map((rule) => rule.id));
  for (const fallback of DEFAULT_SMS_RULES) {
    if (!knownIds.has(fallback.id)) {
      rules.push({ ...fallback });
    }
  }

  return { rules };
}

export function getEnabledRulesForTrigger(
  settings: SmsRulesSettings,
  trigger: SmsRuleTrigger,
): SmsRule[] {
  return settings.rules.filter((rule) => rule.trigger === trigger && rule.enabled);
}

export function renderSmsRuleMessage(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}
