import {
  defaultNotificationRouting,
  normalizeNotificationRouting,
  type NotificationRoutingRule,
} from "@/lib/email/notification-routing";

export const EMAIL_SETTINGS_ID = "email_settings";

/** Kolejność = kolejność katalogu w notification-routing.ts (18 typów zdarzeń). */
export const EMAIL_TEMPLATE_KINDS = [
  "agreement_delivery",
  "agreement_client_responded",
  "service_intake_submitted",
  "service_intake_status",
  "client_offer_sent",
  "client_offer_expiring",
  "offer_approval_requested",
  "client_offer_accepted",
  "change_request_client_responded",
  "client_created",
  "user_created",
  "leave_request_created",
  "leave_request_decided",
  "work_item_assigned",
  "work_item_acceptance_needed",
  "goal_review_due",
  "warranty_expiring",
  "settlement_report",
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
  /** Czy kanał e-mail jest w ogóle używany dla tego zdarzenia (część zdarzeń jest tylko push/SMS). */
  emailEnabled: boolean;
  /** Treść SMS (plain text, {{var}} placeholdery). Puste = brak SMS dla tego zdarzenia. */
  sms: string;
  /** Treść SMS edytowana gdzie indziej (client_created/user_created → /ustawienia/sms) — pole tylko informacyjne. */
  smsManagedElsewhere: boolean;
  /** Push — plain text, {{var}} placeholdery. */
  pushTitle: string;
  pushBody: string;
};

export type EmailSettings = {
  brand: EmailBrandSettings;
  serviceInboxEmail: string;
  /** Macierz: zdarzenie → e-mail (odbiorcy) / push / SMS */
  routing: NotificationRoutingRule[];
  templates: Record<EmailTemplateKind, EmailTemplateSettings>;
};

export type TemplateVariableChannel = "email" | "sms" | "push" | "all";

export type TemplateVariableDescriptor = {
  key: string;
  label: string;
  html?: boolean;
  channels: TemplateVariableChannel[];
};

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateKind, TemplateVariableDescriptor[]> = {
  agreement_delivery: [
    { key: "greeting", label: "Powitanie", html: true, channels: ["email"] },
    { key: "intro", label: "Wstęp (generowany przy wysyłce)", channels: ["email"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "project_line", label: "Linia projektu", html: true, channels: ["email"] },
    { key: "agreements_block", label: "Bloki ustaleń + przyciski", html: true, channels: ["email"] },
    { key: "agreement_title", label: "Tytuł (gdy jedno ustalenie)", channels: ["all"] },
    { key: "count", label: "Liczba ustaleń", channels: ["email"] },
    { key: "subject_base", label: "Bazowy temat (w subject)", channels: ["email"] },
    { key: "offer_url", label: "Link do ustalenia", channels: ["sms"] },
  ],
  agreement_client_responded: [
    { key: "decision_label", label: "Decyzja (Zaakceptowano/Odrzucono)", channels: ["all"] },
    { key: "decision_verb", label: "Czasownik decyzji (zaakceptował/odrzucił)", channels: ["all"] },
    { key: "responder_name", label: "Kto odpowiedział", channels: ["all"] },
    { key: "agreement_title", label: "Tytuł ustalenia", channels: ["all"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "response_note", label: "Notatka klienta", channels: ["email"] },
  ],
  service_intake_submitted: [
    { key: "recipient_name", label: "Imię i nazwisko klienta", channels: ["email", "push"] },
    { key: "reference_number", label: "Numer zgłoszenia", channels: ["all"] },
    { key: "thread_url", label: "URL wątku (tekst)", channels: ["email"] },
    { key: "thread_link", label: "Link do wątku", html: true, channels: ["email"] },
  ],
  service_intake_status: [
    { key: "recipient_name", label: "Imię i nazwisko klienta", channels: ["email", "push"] },
    { key: "reference_number", label: "Numer zgłoszenia", channels: ["all"] },
    { key: "status_label", label: "Status", channels: ["all"] },
    { key: "thread_url", label: "URL wątku (tekst)", channels: ["email"] },
    { key: "thread_link", label: "Link do wątku", html: true, channels: ["email"] },
  ],
  client_offer_sent: [
    { key: "kind_label", label: "Rodzaj (wycenę/rozliczenie)", channels: ["all"] },
    { key: "offer_title", label: "Tytuł oferty", channels: ["all"] },
    { key: "client_name", label: "Imię i nazwisko klienta", channels: ["email"] },
    { key: "offer_url", label: "Link do oferty", channels: ["all"] },
  ],
  client_offer_expiring: [
    { key: "client_name", label: "Imię i nazwisko klienta", channels: ["email"] },
    { key: "offer_title", label: "Tytuł oferty", channels: ["all"] },
    { key: "expires_at", label: "Data wygaśnięcia", channels: ["all"] },
    { key: "offer_url", label: "Link do oferty", channels: ["all"] },
    { key: "kind_label", label: "Rodzaj (oferta/rozliczenie)", channels: ["all"] },
  ],
  offer_approval_requested: [
    { key: "requested_by_name", label: "Kto prosi o akceptację", channels: ["all"] },
    { key: "service_title", label: "Tytuł zlecenia", channels: ["all"] },
    { key: "kind_label", label: "Rodzaj (Wycena/Rozliczenie)", channels: ["all"] },
    { key: "link", label: "Link", channels: ["email"] },
  ],
  client_offer_accepted: [
    { key: "kind_label", label: "Rodzaj (ofertę/rozliczenie)", channels: ["all"] },
    { key: "client_label", label: "Klient", channels: ["all"] },
    { key: "reference_label", label: "Numer / tytuł referencyjny", channels: ["all"] },
  ],
  change_request_client_responded: [
    { key: "decision_verb", label: "Czasownik decyzji (zaakceptował/odrzucił)", channels: ["all"] },
    { key: "responder_name", label: "Kto odpowiedział", channels: ["all"] },
    { key: "title", label: "Tytuł wniosku o zmianę", channels: ["all"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
  ],
  client_created: [
    { key: "fullName", label: "Imię i nazwisko", channels: ["email"] },
    { key: "email", label: "E-mail", channels: ["email"] },
    { key: "phone", label: "Telefon", channels: ["email"] },
  ],
  user_created: [
    { key: "firstName", label: "Imię", channels: ["email"] },
    { key: "lastName", label: "Nazwisko", channels: ["email"] },
    { key: "email", label: "E-mail", channels: ["email"] },
    { key: "loginUrl", label: "Link do logowania", channels: ["email"] },
  ],
  leave_request_created: [
    { key: "employee_name", label: "Pracownik", channels: ["all"] },
    { key: "leave_type_name", label: "Typ urlopu", channels: ["all"] },
    { key: "start_date", label: "Data od", channels: ["all"] },
    { key: "end_date", label: "Data do", channels: ["all"] },
  ],
  leave_request_decided: [
    { key: "decision_label", label: "Decyzja (Zaakceptowano/Odrzucono)", channels: ["all"] },
    { key: "decision_label_lower", label: "Decyzja małą literą (zaakceptowany/odrzucony)", channels: ["email"] },
    { key: "leave_type_name", label: "Typ urlopu", channels: ["all"] },
    { key: "start_date", label: "Data od", channels: ["all"] },
    { key: "end_date", label: "Data do", channels: ["all"] },
    { key: "decision_note_line", label: "Notatka decyzji (linia)", channels: ["email"] },
  ],
  work_item_assigned: [{ key: "title", label: "Tytuł zadania", channels: ["all"] }],
  work_item_acceptance_needed: [
    { key: "employee_name", label: "Pracownik", channels: ["all"] },
    { key: "title", label: "Tytuł zadania", channels: ["all"] },
  ],
  goal_review_due: [
    { key: "goal_name", label: "Nazwa celu", channels: ["all"] },
    { key: "review_status_label", label: "Status przeglądu", channels: ["email"] },
    { key: "review_detail", label: "Szczegóły", channels: ["all"] },
  ],
  warranty_expiring: [
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "ends_at", label: "Data końca gwarancji", channels: ["all"] },
    { key: "warranty_hint", label: "Podpowiedź / akcja", channels: ["all"] },
  ],
  settlement_report: [
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "client_name", label: "Imię i nazwisko klienta", channels: ["email"] },
    { key: "public_url", label: "Link do dashboardu", channels: ["all"] },
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

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
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
      emailEnabled: true,
      sms: 'Ustalenie "{{agreement_title}}" ({{project_name}}) czeka na akceptację: {{offer_url}}',
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    agreement_client_responded: {
      label: "Klient odpowiedział na ustalenie",
      description: "Powiadomienie zespołu po akceptacji/komentarzu klienta.",
      subject: "{{decision_label}}: {{agreement_title}}",
      body:
        "{{responder_name}} {{decision_verb}} ustalenie „{{agreement_title}}” w projekcie {{project_name}}.\n\n{{response_note}}",
      eyebrow: "Ustalenia projektowe",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "{{decision_label}}",
      pushBody: "{{responder_name}} — „{{agreement_title}}” w {{project_name}}.",
    },
    service_intake_submitted: {
      label: "Zgłoszenie serwisowe — potwierdzenie",
      description: "Mail do klienta po utworzeniu zgłoszenia.",
      subject: "Potwierdzenie zgłoszenia {{reference_number}}",
      body:
        "Dzień dobry {{recipient_name}},\n\notrzymaliśmy Twoje zgłoszenie serwisowe {{reference_number}}.\n\nMożesz śledzić status i prowadzić dyskusję pod publicznym linkiem:\n\n{{thread_link}}",
      eyebrow: "Serwis",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Nowe zgłoszenie serwisowe",
      pushBody: "{{reference_number}} — {{recipient_name}}.",
    },
    service_intake_status: {
      label: "Zgłoszenie serwisowe — zmiana statusu",
      description: "Mail do klienta po zmianie statusu zgłoszenia.",
      subject: "Aktualizacja zgłoszenia {{reference_number}}: {{status_label}}",
      body:
        "Dzień dobry {{recipient_name}},\n\nstatus zgłoszenia {{reference_number}} zmienił się na: {{status_label}}.\n\nSzczegóły i odpowiedzi zespołu:\n\n{{thread_link}}",
      eyebrow: "Serwis",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Zmiana statusu zgłoszenia",
      pushBody: "{{reference_number}}: {{status_label}}.",
    },
    client_offer_sent: {
      label: "Wysłanie oferty do klienta",
      description: "Mail + SMS do klienta z linkiem do oferty/rozliczenia.",
      subject: "{{kind_label}}: {{offer_title}}",
      body:
        "Dzień dobry {{client_name}},\n\nprzesyłamy {{kind_label}} „{{offer_title}}” do przejrzenia i decyzji:\n\n{{offer_url}}",
      eyebrow: "Oferta",
      disclaimer: "",
      emailEnabled: true,
      sms: '{{kind_label}} "{{offer_title}}" gotowa do przejrzenia: {{offer_url}}',
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    client_offer_expiring: {
      label: "Oferta wygasa — przypomnienie dla klienta",
      description: "E-mail i SMS do klienta z linkiem do akceptacji; push — krótkie powiadomienie w aplikacji (zespół).",
      subject: "Oferta wygasa {{expires_at}}: {{offer_title}}",
      body:
        "Dzień dobry {{client_name}},\n\nprzypominamy, że oferta „{{offer_title}}” straci ważność {{expires_at}}. Po tym terminie trzeba będzie renegocjować jej warunki.\n\nMożesz zaakceptować, odrzucić albo poprosić o konsultację pod linkiem:\n\n{{offer_url}}",
      eyebrow: "Oferta",
      disclaimer:
        "Po upływie terminu ważności link przestanie działać — warunki będzie trzeba ustalić na nowo.",
      emailEnabled: true,
      sms: 'Oferta "{{offer_title}}" wygasa {{expires_at}}. Potem trzeba renegocjowac warunki. Akceptacja: {{offer_url}}',
      smsManagedElsewhere: false,
      pushTitle: "Oferta wygasa: {{offer_title}}",
      pushBody: "Ważność do {{expires_at}}. Po terminie trzeba renegocjować warunki. Otwórz link, aby zaakceptować.",
    },
    offer_approval_requested: {
      label: "Oferta/rozliczenie czeka na akceptację",
      description: "Pracownik prosi wskazanego administratora o akceptację przed wysyłką do klienta.",
      subject: "{{requested_by_name}} prosi o akceptację — {{service_title}}",
      body:
        "{{requested_by_name}} prosi o akceptację {{kind_label}} przed wysyłką do klienta:\n\n{{service_title}}\n\n{{link}}",
      eyebrow: "Akceptacja wymagana",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "{{requested_by_name}} prosi o akceptację",
      pushBody: "{{kind_label}}: {{service_title}}",
    },
    client_offer_accepted: {
      label: "Klient zaakceptował ofertę",
      description: "Powiadomienie zespołu sprzedaży / opiekuna po akceptacji oferty.",
      subject: "Klient zaakceptował {{kind_label}}",
      body: "{{client_label}} — {{reference_label}}.",
      eyebrow: "Oferty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Klient zaakceptował {{kind_label}}",
      pushBody: "{{client_label}} — {{reference_label}}.",
    },
    change_request_client_responded: {
      label: "Klient odpowiedział na wniosek o zmianę",
      description: "Akceptacja lub odrzucenie wniosku o zmianę przez klienta.",
      subject: "Klient {{decision_verb}} zmianę projektu",
      body: "{{responder_name}} {{decision_verb}} zmianę „{{title}}” w projekcie „{{project_name}}”.",
      eyebrow: "Wnioski o zmianę",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Klient {{decision_verb}} zmianę",
      pushBody: "{{responder_name}} — „{{title}}” w {{project_name}}.",
    },
    client_created: {
      label: "Nowy klient w bazie",
      description: "Powitanie przy dodaniu klienta.",
      subject: "Witamy w Rentgen Luksystem",
      body: "Dzień dobry {{fullName}},\n\ndziękujemy za zaufanie — Twój profil został dodany do naszego systemu.",
      eyebrow: "Powitanie",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: true,
      pushTitle: "",
      pushBody: "",
    },
    user_created: {
      label: "Nowe konto użytkownika",
      description: "Powitanie / dane dostępu przy utworzeniu konta przez administratora.",
      subject: "Twoje konto w aplikacji Rentgen Luksystem",
      body: "Witaj {{firstName}}!\n\nUtworzyliśmy dla Ciebie konto. Zaloguj się: {{loginUrl}}",
      eyebrow: "Powitanie",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: true,
      pushTitle: "",
      pushBody: "",
    },
    leave_request_created: {
      label: "Nowy wniosek urlopowy",
      description: "Powiadomienie przełożonego o wniosku urlopowym pracownika.",
      subject: "Nowy wniosek urlopowy — {{employee_name}}",
      body: "{{employee_name}} prosi o {{leave_type_name}}: {{start_date}} — {{end_date}}.",
      eyebrow: "Urlopy",
      disclaimer: "",
      emailEnabled: true,
      sms: "Wniosek urlopowy: {{employee_name}}, {{leave_type_name}} {{start_date}}-{{end_date}}",
      smsManagedElsewhere: false,
      pushTitle: "Wniosek urlopowy",
      pushBody: "{{employee_name}} — {{leave_type_name}} {{start_date}}–{{end_date}}.",
    },
    leave_request_decided: {
      label: "Decyzja o urlopie",
      description: "Powiadomienie pracownika o akceptacji / odrzuceniu wniosku.",
      subject: "Decyzja o urlopie: {{decision_label}}",
      body:
        "Twój wniosek o {{leave_type_name}} ({{start_date}} — {{end_date}}) został {{decision_label_lower}}.{{decision_note_line}}",
      eyebrow: "Urlopy",
      disclaimer: "",
      emailEnabled: true,
      sms: "Decyzja o urlopie ({{leave_type_name}} {{start_date}}-{{end_date}}): {{decision_label}}",
      smsManagedElsewhere: false,
      pushTitle: "{{decision_label}}",
      pushBody: "{{leave_type_name}} {{start_date}}–{{end_date}}",
    },
    work_item_assigned: {
      label: "Przypisanie zadania (Moja praca)",
      description: "Nowe lub zmienione zadanie przypisane do użytkownika.",
      subject: "Nowe zadanie: {{title}}",
      body: "Przypisano Ci zadanie „{{title}}”.",
      eyebrow: "Moja praca",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Nowe zadanie przypisane",
      pushBody: "{{title}}",
    },
    work_item_acceptance_needed: {
      label: "Wymagana akceptacja zadania",
      description: "Zadanie czeka na akceptację / weryfikację.",
      subject: "Zadanie do weryfikacji: {{title}}",
      body: "{{employee_name}} zgłosił(a) zadanie „{{title}}” do weryfikacji.",
      eyebrow: "Moja praca",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "{{employee_name}} — zadanie do weryfikacji",
      pushBody: "{{title}}",
    },
    goal_review_due: {
      label: "Zbliżający się przegląd celu",
      description: "Przypomnienie o przeglądzie celu lub ryzyku.",
      subject: "Przegląd celu «{{goal_name}}»",
      body: "{{review_status_label}}: {{goal_name}}. {{review_detail}}",
      eyebrow: "Cele",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Przegląd celu «{{goal_name}}»",
      pushBody: "{{review_detail}}",
    },
    warranty_expiring: {
      label: "Kończąca się gwarancja",
      description: "Alert dla zespołu o zbliżającym się końcu gwarancji.",
      subject: "Gwarancja kończy się: {{project_name}}",
      body: "Koniec gwarancji {{ends_at}} dla projektu {{project_name}}. {{warranty_hint}}",
      eyebrow: "Serwis",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "Gwarancja kończy się: {{project_name}}",
      pushBody: "Koniec {{ends_at}}. Przygotuj przedłużenie lub przegląd.",
    },
    settlement_report: {
      label: "Raport rozliczenia projektu dla klienta",
      description:
        "Ręczna wysyłka podsumowania rozliczeń (należności, spłaty, harmonogram, saldo) z linkiem do dashboardu.",
      subject: "Rozliczenie projektu {{project_name}}",
      body: "Dzień dobry {{client_name}},\n\nprzesyłamy podsumowanie rozliczeń dla projektu {{project_name}}:\n\n{{public_url}}",
      eyebrow: "Rozliczenie",
      disclaimer: "",
      emailEnabled: true,
      sms: 'Rozliczenie projektu "{{project_name}}" gotowe: {{public_url}}',
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
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

function normalizeTemplate(kind: EmailTemplateKind, value: unknown): EmailTemplateSettings {
  const defaults = defaultEmailTemplates()[kind];
  const data = asObject(value);
  return {
    label: asString(data.label, defaults.label).trim() || defaults.label,
    description: asString(data.description, defaults.description),
    subject: asString(data.subject, defaults.subject).trim() || defaults.subject,
    body: asString(data.body, defaults.body),
    eyebrow: asString(data.eyebrow, defaults.eyebrow),
    disclaimer: asString(data.disclaimer, defaults.disclaimer),
    emailEnabled: asBoolean(data.emailEnabled, defaults.emailEnabled),
    sms: asString(data.sms, defaults.sms),
    smsManagedElsewhere: asBoolean(data.smsManagedElsewhere, defaults.smsManagedElsewhere),
    pushTitle: asString(data.pushTitle, defaults.pushTitle),
    pushBody: asString(data.pushBody, defaults.pushBody),
  };
}

export function normalizeEmailSettings(value: unknown): EmailSettings {
  const data = asObject(value);
  const defaults = defaultEmailSettings();
  const templatesRaw = asObject(data.templates);

  const templates = {} as Record<EmailTemplateKind, EmailTemplateSettings>;
  for (const kind of EMAIL_TEMPLATE_KINDS) {
    templates[kind] = normalizeTemplate(kind, templatesRaw[kind]);
  }

  return {
    brand: normalizeBrand(data.brand),
    serviceInboxEmail:
      asString(data.serviceInboxEmail, defaults.serviceInboxEmail).trim() ||
      defaults.serviceInboxEmail,
    routing: normalizeNotificationRouting(data.routing),
    templates,
  };
}
