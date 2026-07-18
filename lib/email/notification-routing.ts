export const NOTIFICATION_AUDIENCES = ["client", "trade", "user", "inbox"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_CHANNELS = ["email", "push", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationRoutingCategory =
  | "projekty"
  | "serwis"
  | "oferty"
  | "konta"
  | "urlopy"
  | "moja_praca"
  | "cele"
  | "zmiany";

export const NOTIFICATION_ROUTING_CATEGORY_LABELS: Record<NotificationRoutingCategory, string> = {
  projekty: "Projekty i ustalenia",
  serwis: "Serwis",
  oferty: "Oferty",
  konta: "Klienci i użytkownicy",
  urlopy: "Urlopy",
  moja_praca: "Moja praca",
  cele: "Cele",
  zmiany: "Wnioski o zmianę",
};

export type NotificationScheduleDefaults = {
  /** Ile dni przed zdarzeniem (np. wygaśnięciem oferty) */
  daysBefore: number;
  /** Godzina wysyłki 0–23 (Europe/Warsaw) */
  notifyAtHour: number;
};

export type NotificationActionDefinition = {
  id: string;
  label: string;
  description: string;
  category: NotificationRoutingCategory;
  /** Odbiorcy, których można włączyć dla e-mail */
  emailAudiences: NotificationAudience[];
  /** Czy push ma sens (zawsze do użytkownika / zespołu) */
  supportsPush: boolean;
  /** Czy SMS ma sens (telefon klienta lub użytkownika) */
  supportsSms: boolean;
  /** Harmonogram: dni przed + godzina (Europe/Warsaw) */
  supportsSchedule?: boolean;
  /** Powiązanie z regułą SMS (sync enabled) */
  smsRuleId?: string;
  /** Powiązanie z szablonem e-mail */
  emailTemplateKind?:
    | "agreement_delivery"
    | "service_intake_submitted"
    | "service_intake_status";
  /** Domyślne wartości */
  defaults: {
    email: Partial<Record<NotificationAudience, boolean>>;
    push: boolean;
    sms: boolean;
    schedule?: NotificationScheduleDefaults;
  };
};

/** Katalog zdarzeń — konfiguracja w UI + egzekwowanie tam, gdzie już mamy wysyłkę. */
export const NOTIFICATION_ACTION_DEFINITIONS: NotificationActionDefinition[] = [
  {
    id: "agreement_delivery",
    label: "Wysłanie ustaleń do akceptacji",
    description:
      "Ręczna wysyłka ustaleń projektowych (klient lub branża) z przyciskami akceptacji / dyskusji.",
    category: "projekty",
    emailAudiences: ["client", "trade"],
    supportsPush: false,
    supportsSms: false,
    emailTemplateKind: "agreement_delivery",
    defaults: { email: { client: true, trade: true }, push: false, sms: false },
  },
  {
    id: "agreement_client_responded",
    label: "Klient odpowiedział na ustalenie",
    description: "Akceptacja lub komentarz klienta do ustalenia — powiadomienie zespołu.",
    category: "projekty",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "service_intake_submitted",
    label: "Nowe zgłoszenie serwisowe",
    description: "Potwierdzenie do klienta + kopia na skrzynkę serwisową po utworzeniu zgłoszenia.",
    category: "serwis",
    emailAudiences: ["client", "inbox"],
    supportsPush: true,
    supportsSms: false,
    emailTemplateKind: "service_intake_submitted",
    defaults: { email: { client: true, inbox: true }, push: true, sms: false },
  },
  {
    id: "service_intake_status",
    label: "Zmiana statusu zgłoszenia serwisowego",
    description: "Aktualizacja statusu zgłoszenia do klienta i kopii wewnętrznej.",
    category: "serwis",
    emailAudiences: ["client", "inbox"],
    supportsPush: true,
    supportsSms: false,
    emailTemplateKind: "service_intake_status",
    defaults: { email: { client: true, inbox: true }, push: false, sms: false },
  },
  {
    id: "client_offer_sent",
    label: "Wysłanie oferty do klienta",
    description: "Oferta / propozycja wysłana klientowi (link publiczny).",
    category: "oferty",
    emailAudiences: ["client"],
    supportsPush: false,
    supportsSms: true,
    defaults: { email: { client: true }, push: false, sms: false },
  },
  {
    id: "client_offer_expiring",
    label: "Oferta wygasa — przypomnienie dla klienta",
    description:
      "Przypomnienie przed utratą ważności oferty: trzeba będzie renegocjować warunki. E-mail i SMS do klienta z linkiem do akceptacji; push — krótkie powiadomienie w aplikacji (zespół) z tym samym linkiem.",
    category: "oferty",
    emailAudiences: ["client"],
    supportsPush: true,
    supportsSms: true,
    supportsSchedule: true,
    defaults: {
      email: { client: true },
      push: true,
      sms: false,
      schedule: { daysBefore: 3, notifyAtHour: 9 },
    },
  },
  {
    id: "client_offer_accepted",
    label: "Klient zaakceptował ofertę",
    description: "Powiadomienie zespołu sprzedaży / opiekuna po akceptacji oferty.",
    category: "oferty",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "change_request_client_responded",
    label: "Klient odpowiedział na wniosek o zmianę",
    description: "Akceptacja lub odrzucenie wniosku o zmianę przez klienta.",
    category: "zmiany",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: true }, push: true, sms: false },
  },
  {
    id: "client_created",
    label: "Nowy klient w bazie",
    description: "Powitanie przy dodaniu klienta (obecnie głównie SMS).",
    category: "konta",
    emailAudiences: ["client"],
    supportsPush: false,
    supportsSms: true,
    smsRuleId: "client_created_welcome",
    defaults: { email: { client: false }, push: false, sms: false },
  },
  {
    id: "user_created",
    label: "Nowe konto użytkownika",
    description: "Powitanie / dane dostępu przy utworzeniu konta przez administratora.",
    category: "konta",
    emailAudiences: ["user"],
    supportsPush: false,
    supportsSms: true,
    smsRuleId: "user_created_welcome",
    defaults: { email: { user: false }, push: false, sms: false },
  },
  {
    id: "leave_request_created",
    label: "Nowy wniosek urlopowy",
    description: "Powiadomienie przełożonego o wniosku urlopowym pracownika.",
    category: "urlopy",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: true,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "leave_request_decided",
    label: "Decyzja o urlopie",
    description: "Powiadomienie pracownika o akceptacji / odrzuceniu wniosku.",
    category: "urlopy",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: true,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "work_item_assigned",
    label: "Przypisanie zadania (Moja praca)",
    description: "Nowe lub zmienione zadanie przypisane do użytkownika.",
    category: "moja_praca",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "work_item_acceptance_needed",
    label: "Wymagana akceptacja zadania",
    description: "Zadanie czeka na akceptację / weryfikację.",
    category: "moja_praca",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "goal_review_due",
    label: "Zbliżający się przegląd celu",
    description: "Przypomnienie o przeglądzie celu lub ryzyku.",
    category: "cele",
    emailAudiences: ["user"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false }, push: true, sms: false },
  },
  {
    id: "warranty_expiring",
    label: "Kończąca się gwarancja",
    description: "Alert dla zespołu o zbliżającym się końcu gwarancji.",
    category: "serwis",
    emailAudiences: ["user", "client"],
    supportsPush: true,
    supportsSms: false,
    defaults: { email: { user: false, client: false }, push: true, sms: false },
  },
  {
    id: "settlement_report",
    label: "Raport rozliczenia projektu dla klienta",
    description:
      "Ręczna wysyłka podsumowania rozliczeń (należności, spłaty, harmonogram, saldo) z linkiem do dashboardu.",
    category: "projekty",
    emailAudiences: ["client"],
    supportsPush: false,
    supportsSms: false,
    defaults: { email: { client: true }, push: false, sms: false },
  },
];

export type NotificationRoutingRule = {
  id: string;
  email: Partial<Record<NotificationAudience, boolean>>;
  push: boolean;
  sms: boolean;
  /** Ile dni przed zdarzeniem (gdy supportsSchedule) */
  daysBefore?: number;
  /** Godzina 0–23 Europe/Warsaw (gdy supportsSchedule) */
  notifyAtHour?: number;
};

const DEFAULT_SCHEDULE: NotificationScheduleDefaults = {
  daysBefore: 3,
  notifyAtHour: 9,
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function getRuleSchedule(
  rule: NotificationRoutingRule | null | undefined,
  definition?: NotificationActionDefinition,
): NotificationScheduleDefaults {
  const defaults = definition?.defaults.schedule ?? DEFAULT_SCHEDULE;
  return {
    daysBefore: clampInt(rule?.daysBefore, 1, 60, defaults.daysBefore),
    notifyAtHour: clampInt(rule?.notifyAtHour, 0, 23, defaults.notifyAtHour),
  };
}

export const NOTIFICATION_AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  client: "Klient",
  trade: "Branża",
  user: "Użytkownik",
  inbox: "Skrzynka serwisowa",
};

export function getNotificationActionDefinition(
  id: string,
): NotificationActionDefinition | undefined {
  return NOTIFICATION_ACTION_DEFINITIONS.find((entry) => entry.id === id);
}

export function defaultNotificationRouting(): NotificationRoutingRule[] {
  return NOTIFICATION_ACTION_DEFINITIONS.map((definition) => {
    const schedule = definition.supportsSchedule
      ? getRuleSchedule(null, definition)
      : null;
    return {
      id: definition.id,
      email: { ...definition.defaults.email },
      push: definition.defaults.push,
      sms: definition.defaults.sms,
      ...(schedule
        ? { daysBefore: schedule.daysBefore, notifyAtHour: schedule.notifyAtHour }
        : {}),
    };
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeNotificationRouting(value: unknown): NotificationRoutingRule[] {
  const defaults = defaultNotificationRouting();
  const defaultsById = new Map(defaults.map((rule) => [rule.id, rule]));
  const raw = Array.isArray(value) ? value : [];

  const normalized: NotificationRoutingRule[] = [];

  for (const entry of raw) {
    const data = asObject(entry);
    const id = typeof data.id === "string" ? data.id : "";
    const definition = getNotificationActionDefinition(id);
    const fallback = defaultsById.get(id);
    if (!definition || !fallback) {
      continue;
    }

    const emailRaw = asObject(data.email);
    const email: Partial<Record<NotificationAudience, boolean>> = {};
    for (const audience of definition.emailAudiences) {
      email[audience] =
        typeof emailRaw[audience] === "boolean"
          ? emailRaw[audience]
          : Boolean(fallback.email[audience]);
    }

    const schedule = definition.supportsSchedule
      ? getRuleSchedule(
          {
            id,
            email,
            push: false,
            sms: false,
            daysBefore:
              typeof data.daysBefore === "number" || typeof data.daysBefore === "string"
                ? Number(data.daysBefore)
                : fallback.daysBefore,
            notifyAtHour:
              typeof data.notifyAtHour === "number" || typeof data.notifyAtHour === "string"
                ? Number(data.notifyAtHour)
                : fallback.notifyAtHour,
          },
          definition,
        )
      : null;

    normalized.push({
      id,
      email,
      push: definition.supportsPush
        ? typeof data.push === "boolean"
          ? data.push
          : fallback.push
        : false,
      sms: definition.supportsSms
        ? typeof data.sms === "boolean"
          ? data.sms
          : fallback.sms
        : false,
      ...(schedule
        ? { daysBefore: schedule.daysBefore, notifyAtHour: schedule.notifyAtHour }
        : {}),
    });
  }

  const known = new Set(normalized.map((rule) => rule.id));
  for (const fallback of defaults) {
    if (!known.has(fallback.id)) {
      normalized.push({ ...fallback, email: { ...fallback.email } });
    }
  }

  // Zachowaj kolejność katalogu
  const order = new Map(NOTIFICATION_ACTION_DEFINITIONS.map((d, index) => [d.id, index]));
  normalized.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return normalized;
}

export function getRoutingRule(
  rules: NotificationRoutingRule[],
  actionId: string,
): NotificationRoutingRule | null {
  return rules.find((rule) => rule.id === actionId) ?? null;
}

export function isEmailAudienceEnabled(
  rules: NotificationRoutingRule[],
  actionId: string,
  audience: NotificationAudience,
): boolean {
  const rule = getRoutingRule(rules, actionId);
  if (!rule) {
    const definition = getNotificationActionDefinition(actionId);
    return Boolean(definition?.defaults.email[audience]);
  }
  return rule.email[audience] === true;
}

export function isChannelEnabled(
  rules: NotificationRoutingRule[],
  actionId: string,
  channel: Exclude<NotificationChannel, "email">,
): boolean {
  const rule = getRoutingRule(rules, actionId);
  const definition = getNotificationActionDefinition(actionId);
  if (!definition) return false;
  if (channel === "push" && !definition.supportsPush) return false;
  if (channel === "sms" && !definition.supportsSms) return false;
  if (!rule) {
    return channel === "push" ? definition.defaults.push : definition.defaults.sms;
  }
  return channel === "push" ? rule.push : rule.sms;
}

export function groupNotificationActionsByCategory() {
  const groups: Array<{
    category: NotificationRoutingCategory;
    label: string;
    actions: NotificationActionDefinition[];
  }> = [];

  for (const definition of NOTIFICATION_ACTION_DEFINITIONS) {
    let group = groups.find((entry) => entry.category === definition.category);
    if (!group) {
      group = {
        category: definition.category,
        label: NOTIFICATION_ROUTING_CATEGORY_LABELS[definition.category],
        actions: [],
      };
      groups.push(group);
    }
    group.actions.push(definition);
  }

  return groups;
}
