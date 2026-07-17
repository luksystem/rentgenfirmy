import {
  defaultNotificationRouting,
  normalizeNotificationRouting,
  type NotificationRoutingRule,
} from "@/lib/email/notification-routing";

export const EMAIL_SETTINGS_ID = "email_settings";

export const EMAIL_TEMPLATE_KINDS = [
  "agreement_delivery",
  "service_intake_submitted",
  "service_intake_status",
] as const;

export type EmailTemplateKind = (typeof EMAIL_TEMPLATE_KINDS)[number];

export type EmailBrandSettings = {
  headerColorFrom: string;
  headerColorTo: string;
  signOff: string;
  footerNote: string;
  showCompanyFooter: boolean;
};

export type EmailTemplateSettings = {
  label: string;
  description: string;
  /** Subject z placeholderami, np. {{reference_number}} */
  subject: string;
  /**
   * Treść (plain text). Nowe linie → akapity.
   * Placeholdery tekstowe: {{recipient_name}}, {{project_name}}, …
   * Placeholdery HTML: {{agreements_block}}, {{thread_link}}, {{greeting}}, {{project_line}}
   */
  body: string;
  /** Etykieta w nagłówku maila */
  eyebrow: string;
  /** Pusty = ukryj disclaimer */
  disclaimer: string;
};

export type EmailSettings = {
  brand: EmailBrandSettings;
  serviceInboxEmail: string;
  /** Macierz: zdarzenie → e-mail (odbiorcy) / push / SMS */
  routing: NotificationRoutingRule[];
  templates: Record<EmailTemplateKind, EmailTemplateSettings>;
};

export const EMAIL_TEMPLATE_VARIABLES: Record<
  EmailTemplateKind,
  Array<{ key: string; label: string; html?: boolean }>
> = {
  agreement_delivery: [
    { key: "greeting", label: "Powitanie", html: true },
    { key: "intro", label: "Wstęp (generowany przy wysyłce)" },
    { key: "project_name", label: "Nazwa projektu" },
    { key: "project_line", label: "Linia projektu", html: true },
    { key: "agreements_block", label: "Bloki ustaleń + przyciski", html: true },
    { key: "agreement_title", label: "Tytuł (gdy jedno ustalenie)" },
    { key: "count", label: "Liczba ustaleń" },
    { key: "subject_base", label: "Bazowy temat (w subject)" },
  ],
  service_intake_submitted: [
    { key: "recipient_name", label: "Imię i nazwisko klienta" },
    { key: "reference_number", label: "Numer zgłoszenia" },
    { key: "thread_url", label: "URL wątku (tekst)" },
    { key: "thread_link", label: "Link do wątku", html: true },
  ],
  service_intake_status: [
    { key: "recipient_name", label: "Imię i nazwisko klienta" },
    { key: "reference_number", label: "Numer zgłoszenia" },
    { key: "status_label", label: "Status" },
    { key: "thread_url", label: "URL wątku (tekst)" },
    { key: "thread_link", label: "Link do wątku", html: true },
  ],
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function defaultEmailBrandSettings(): EmailBrandSettings {
  return {
    headerColorFrom: "#0f172a",
    headerColorTo: "#1e293b",
    signOff: "Pozdrawiamy,\nZespół Rentgen firmy",
    footerNote: "Wiadomość wygenerowana automatycznie — odpowiedzi trafiają na adres Reply-To.",
    showCompanyFooter: true,
  };
}

export function defaultEmailTemplates(): Record<EmailTemplateKind, EmailTemplateSettings> {
  return {
    agreement_delivery: {
      label: "Ustalenia projektowe",
      description: "Wysyłka ustaleń do klienta lub branży (akceptacja / dyskusja).",
      subject: "{{subject_base}}",
      body: "{{greeting}}\n\n{{intro}}\n\n{{project_line}}\n\n{{agreements_block}}",
      eyebrow: "Ustalenia projektowe",
      disclaimer:
        "Zaakceptowane ustalenia są wiążące na dalszych etapach realizacji projektu. Prosimy o dokładne zapoznanie się z treścią przed akceptacją.",
    },
    service_intake_submitted: {
      label: "Zgłoszenie serwisowe — potwierdzenie",
      description: "Mail do klienta po utworzeniu zgłoszenia.",
      subject: "Potwierdzenie zgłoszenia {{reference_number}}",
      body:
        "Dzień dobry {{recipient_name}},\n\notrzymaliśmy Twoje zgłoszenie serwisowe {{reference_number}}.\n\nMożesz śledzić status i prowadzić dyskusję pod publicznym linkiem:\n\n{{thread_link}}",
      eyebrow: "Serwis",
      disclaimer: "",
    },
    service_intake_status: {
      label: "Zgłoszenie serwisowe — zmiana statusu",
      description: "Mail do klienta po zmianie statusu zgłoszenia.",
      subject: "Aktualizacja zgłoszenia {{reference_number}}: {{status_label}}",
      body:
        "Dzień dobry {{recipient_name}},\n\nstatus zgłoszenia {{reference_number}} zmienił się na: {{status_label}}.\n\nSzczegóły i odpowiedzi zespołu:\n\n{{thread_link}}",
      eyebrow: "Serwis",
      disclaimer: "",
    },
  };
}

export function defaultEmailSettings(): EmailSettings {
  return {
    brand: defaultEmailBrandSettings(),
    serviceInboxEmail: "serwis@luksystem.pl",
    routing: defaultNotificationRouting(),
    templates: defaultEmailTemplates(),
  };
}

function normalizeBrand(value: unknown): EmailBrandSettings {
  const data = asObject(value);
  const defaults = defaultEmailBrandSettings();
  return {
    headerColorFrom: asString(data.headerColorFrom, defaults.headerColorFrom).trim() || defaults.headerColorFrom,
    headerColorTo: asString(data.headerColorTo, defaults.headerColorTo).trim() || defaults.headerColorTo,
    signOff: asString(data.signOff, defaults.signOff),
    footerNote: asString(data.footerNote, defaults.footerNote),
    showCompanyFooter: data.showCompanyFooter !== false,
  };
}

function normalizeTemplate(
  kind: EmailTemplateKind,
  value: unknown,
): EmailTemplateSettings {
  const defaults = defaultEmailTemplates()[kind];
  const data = asObject(value);
  return {
    label: asString(data.label, defaults.label).trim() || defaults.label,
    description: asString(data.description, defaults.description),
    subject: asString(data.subject, defaults.subject).trim() || defaults.subject,
    body: asString(data.body, defaults.body),
    eyebrow: asString(data.eyebrow, defaults.eyebrow),
    disclaimer: asString(data.disclaimer, defaults.disclaimer),
  };
}

export function normalizeEmailSettings(value: unknown): EmailSettings {
  const data = asObject(value);
  const defaults = defaultEmailSettings();
  const templatesRaw = asObject(data.templates);

  return {
    brand: normalizeBrand(data.brand),
    serviceInboxEmail:
      asString(data.serviceInboxEmail, defaults.serviceInboxEmail).trim() ||
      defaults.serviceInboxEmail,
    routing: normalizeNotificationRouting(data.routing),
    templates: {
      agreement_delivery: normalizeTemplate("agreement_delivery", templatesRaw.agreement_delivery),
      service_intake_submitted: normalizeTemplate(
        "service_intake_submitted",
        templatesRaw.service_intake_submitted,
      ),
      service_intake_status: normalizeTemplate(
        "service_intake_status",
        templatesRaw.service_intake_status,
      ),
    },
  };
}
