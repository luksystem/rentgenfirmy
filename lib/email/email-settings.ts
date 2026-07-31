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
  "change_request_delivery",
  "change_request_client_responded",
  "process_snapshot_delivered",
  "client_created",
  "user_created",
  "leave_request_created",
  "leave_request_decided",
  "work_item_assigned",
  "work_item_acceptance_needed",
  "goal_review_due",
  "warranty_expiring",
  "settlement_report",
  "resource_plan_employee_digest",
  "resource_plan_client_summary",
  "resource_plan_client_offer_notice",
  "resource_plan_admin_summary",
  "stage_dom_1_uruchomienie",
  "stage_dom_2_dane_projektowe",
  "stage_dom_3_projektowanie",
  "stage_dom_4_instalacja",
  "stage_dom_5_koordynacja",
  "stage_dom_6_prefabrykacja",
  "stage_dom_7_rozdzielnia",
  "stage_dom_8_montaze",
  "stage_dom_9_uruchomienie_testy",
  "stage_dom_10_optymalizacja",
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

/** Wspólne placeholdery dla 10 maili podsumowujących zamknięcie etapu procesu DOM. */
const STAGE_DOM_VARIABLES: TemplateVariableDescriptor[] = [
  { key: "client_name", label: "Imię i nazwisko klienta", channels: ["all"] },
  { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
  {
    key: "pending_items_block",
    label: "Czekające na decyzję: zmiany projektu, ustalenia, oferty (wklej ręcznie z ROT)",
    channels: ["all"],
  },
];

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateKind, TemplateVariableDescriptor[]> = {
  agreement_delivery: [
    { key: "greeting", label: "Powitanie", html: true, channels: ["email"] },
    { key: "intro", label: "Wstęp (generowany przy wysyłce)", channels: ["email"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "project_line", label: "Linia projektu", html: true, channels: ["email"] },
    { key: "sender_note", label: "Notatka nadawcy (wpisana przy wysyłce)", html: true, channels: ["email"] },
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
  change_request_delivery: [
    { key: "greeting", label: "Powitanie", html: true, channels: ["email"] },
    { key: "intro", label: "Wstęp (generowany przy wysyłce)", channels: ["email"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "project_line", label: "Linia projektu", html: true, channels: ["email"] },
    { key: "sender_note", label: "Notatka nadawcy (wpisana przy wysyłce)", html: true, channels: ["email"] },
    { key: "change_requests_block", label: "Bloki zmian + przycisk", html: true, channels: ["email"] },
    { key: "change_request_title", label: "Tytuł (gdy jedna zmiana)", channels: ["all"] },
    { key: "count", label: "Liczba zmian", channels: ["email"] },
    { key: "subject_base", label: "Bazowy temat (w subject)", channels: ["email"] },
  ],
  process_snapshot_delivered: [
    { key: "greeting", label: "Powitanie", html: true, channels: ["email"] },
    { key: "project_name", label: "Nazwa projektu", channels: ["all"] },
    { key: "item_title", label: "Tytuł elementu procesu", channels: ["all"] },
    { key: "client_message", label: "Wiadomość zdefiniowana w szablonie", html: true, channels: ["email"] },
    { key: "employee_note", label: "Notatka pracownika (jeśli dodana)", html: true, channels: ["email"] },
    { key: "photo_block", label: "Zdjęcie (osadzone w mailu)", html: true, channels: ["email"] },
    { key: "photo_url", label: "Link do zdjęcia", channels: ["sms"] },
  ],
  service_intake_submitted: [
    { key: "recipient_name", label: "Imię i nazwisko klienta", channels: ["email", "push"] },
    { key: "reference_number", label: "Numer zgłoszenia", channels: ["all"] },
    { key: "thread_url", label: "URL wątku (tekst)", channels: ["email", "sms"] },
    { key: "thread_link", label: "Link do wątku", html: true, channels: ["email"] },
  ],
  service_intake_status: [
    { key: "recipient_name", label: "Imię i nazwisko klienta", channels: ["email", "push"] },
    { key: "reference_number", label: "Numer zgłoszenia", channels: ["all"] },
    { key: "status_label", label: "Status", channels: ["all"] },
    { key: "thread_url", label: "URL wątku (tekst)", channels: ["email", "sms"] },
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
  resource_plan_employee_digest: [
    { key: "employee_name", label: "Imię i nazwisko pracownika", channels: ["all"] },
    { key: "range_label", label: "Zakres dat", channels: ["all"] },
    { key: "items_block", label: "Lista zadań w zakresie (wielolinijkowa)", channels: ["all"] },
  ],
  resource_plan_client_summary: [
    { key: "client_name", label: "Imię i nazwisko klienta", channels: ["all"] },
    { key: "range_label", label: "Zakres dat", channels: ["all"] },
    { key: "done_block", label: "Zrealizowane prace + feedback (wielolinijkowa)", channels: ["all"] },
    { key: "upcoming_block", label: "Zaplanowane prace (wielolinijkowa)", channels: ["all"] },
  ],
  resource_plan_client_offer_notice: [
    { key: "client_name", label: "Imię i nazwisko klienta", channels: ["all"] },
    { key: "range_label", label: "Zakres dat", channels: ["all"] },
  ],
  resource_plan_admin_summary: [
    { key: "range_label", label: "Zakres dat", channels: ["all"] },
    { key: "item_count", label: "Liczba elementów planu", channels: ["all"] },
    { key: "total_hours", label: "Suma godzin", channels: ["all"] },
    { key: "assignee_count", label: "Liczba zaangażowanych osób", channels: ["all"] },
  ],
  stage_dom_1_uruchomienie: STAGE_DOM_VARIABLES,
  stage_dom_2_dane_projektowe: STAGE_DOM_VARIABLES,
  stage_dom_3_projektowanie: STAGE_DOM_VARIABLES,
  stage_dom_4_instalacja: STAGE_DOM_VARIABLES,
  stage_dom_5_koordynacja: STAGE_DOM_VARIABLES,
  stage_dom_6_prefabrykacja: STAGE_DOM_VARIABLES,
  stage_dom_7_rozdzielnia: STAGE_DOM_VARIABLES,
  stage_dom_8_montaze: STAGE_DOM_VARIABLES,
  stage_dom_9_uruchomienie_testy: STAGE_DOM_VARIABLES,
  stage_dom_10_optymalizacja: STAGE_DOM_VARIABLES,
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
      body: "{{greeting}}\n\n{{intro}}\n\n{{project_line}}\n\n{{sender_note}}\n\n{{agreements_block}}",
      eyebrow: "Ustalenia projektowe",
      disclaimer:
        "Zaakceptowane ustalenia są wiążące na dalszych etapach realizacji projektu. Prosimy o dokładne zapoznanie się z treścią przed akceptacją.",
      emailEnabled: true,
      sms: 'Ustalenie "{{agreement_title}}" ({{project_name}}) czeka na akceptację: {{offer_url}}',
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    change_request_delivery: {
      label: "Zmiany projektu",
      description: "Wysyłka wniosku(ów) o zmianę do klienta.",
      subject: "{{subject_base}}",
      body: "{{greeting}}\n\n{{intro}}\n\n{{project_line}}\n\n{{sender_note}}\n\n{{change_requests_block}}",
      eyebrow: "Zmiana projektu",
      disclaimer:
        "Zaakceptowane zmiany są wiążące na dalszych etapach realizacji projektu. Prosimy o dokładne zapoznanie się z treścią przed akceptacją.",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    process_snapshot_delivered: {
      label: "Zdjęcie do klienta (proces)",
      description: "Zdjęcie z notatką wysłane klientowi z elementu procesu typu „Zdjęcie do klienta”.",
      subject: "Nowe zdjęcie: {{item_title}} — {{project_name}}",
      body: "{{greeting}}\n\n{{client_message}}\n\n{{employee_note}}\n\n{{photo_block}}",
      eyebrow: "Zdjęcie z realizacji",
      disclaimer: "",
      emailEnabled: true,
      sms: "Nowe zdjęcie z Państwa projektu ({{project_name}}): {{photo_url}}",
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
      sms: "Zgloszenie {{reference_number}} przyjete. Podglad: {{thread_url}}",
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
      sms: "Zgloszenie {{reference_number}}: {{status_label}}. Szczegoly: {{thread_url}}",
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
      sms: "Gwarancja projektu {{project_name}} konczy sie {{ends_at}}.",
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
    resource_plan_employee_digest: {
      label: "Plan pracy dla pracownika",
      description:
        "Wysyłka planu pracy pracownikowi z Planu Zasobów (\"Roześlij plan\") — treść trafia na Slacka, e-mail jest fallbackiem gdy brak Slack ID.",
      subject: "Twój plan pracy ({{range_label}})",
      body: "Cześć {{employee_name}}!\n\nTwój plan na {{range_label}}:\n\n{{items_block}}",
      eyebrow: "Plan zasobów",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    resource_plan_client_summary: {
      label: "Podsumowanie prac dla klienta",
      description: "Wysyłka podsumowania wykonanych/zaplanowanych prac klientowi z Planu Zasobów (\"Roześlij plan\").",
      subject: "Podsumowanie prac ({{range_label}})",
      body:
        "Dzień dobry {{client_name}},\n\npodsumowanie prac w okresie {{range_label}}:\n\n{{done_block}}\n\n{{upcoming_block}}\n\nW razie pytań prosimy o kontakt.",
      eyebrow: "Plan zasobów",
      disclaimer: "",
      emailEnabled: true,
      sms: "Dzien dobry {{client_name}}, podsumowanie prac ({{range_label}}) wyslalismy mailem. W razie pytan prosimy o kontakt.",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    resource_plan_client_offer_notice: {
      label: "Zapowiedź oferty dla klienta",
      description: "Krótka zapowiedź, że klient wkrótce dostanie ofertę — samą ofertę wysyła się osobno z modułu Oferty.",
      subject: "Przygotowujemy dla Państwa ofertę",
      body:
        "Dzień dobry {{client_name}},\n\ndziękujemy za dotychczasową współpracę w okresie {{range_label}} — przygotowujemy dla Państwa ofertę na kolejny etap prac, wkrótce się z Państwem skontaktujemy.\n\nW razie pytań prosimy o kontakt.",
      eyebrow: "Plan zasobów",
      disclaimer: "",
      emailEnabled: true,
      sms: "Dzien dobry {{client_name}}, przygotowujemy dla Panstwa oferte na kolejny etap prac - wkrotce sie skontaktujemy.",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    resource_plan_admin_summary: {
      label: "Podsumowanie planu dla administratorów",
      description: "Zbiorcze podsumowanie planu (liczba elementów, godziny, osoby) wysyłane do administratorów.",
      subject: "Podsumowanie planu ({{range_label}})",
      body:
        "Podsumowanie planu {{range_label}}: {{item_count}} elementów, ~{{total_hours}}h, {{assignee_count}} osób zaangażowanych.",
      eyebrow: "Plan zasobów",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_1_uruchomienie: {
      label: "Etap 1 — Uruchomienie projektu",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Projekt uruchomiony”. Wyślij, zanim przejdziecie do zbierania danych projektowych.",
      subject: "{{project_name}} — zamykamy etap: Uruchomienie projektu",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Uruchomienie projektu” — kamień milowy: Projekt uruchomiony.\n\nCo zrobiliśmy w tym etapie:\n• założyliśmy Państwa projekt i dostęp do Rentgena,\n• uruchomiliśmy kanał komunikacji i przedstawiliśmy zespół i role,\n• przygotowaliśmy dokumenty startowe i rozliczyliśmy pierwszą transzę.\n\nCo dalej — etap „Zebranie danych projektowych”:\nkompletujemy projekt architektoniczny i branżowy oraz kontakty do ekip wykonawczych, z którymi trzeba skoordynować instalację.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_2_dane_projektowe: {
      label: "Etap 2 — Zebranie danych projektowych",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Komplet danych projektowych”. Wyślij przed spotkaniem projektowym.",
      subject: "{{project_name}} — zamykamy etap: Zebranie danych projektowych",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Zebranie danych projektowych” — kamień milowy: Komplet danych projektowych.\n\nCo zrobiliśmy w tym etapie:\n• zebraliśmy projekt architektoniczny i branżowy oraz rzuty,\n• skompletowaliśmy kontakty do wykonawców (elektryk, hydraulik, HVAC, pompa ciepła, rolety, stolarka, alarm, kierownik budowy),\n• zweryfikowaliśmy kompletność dokumentacji.\n\nCo dalej — etap „Projektowanie i akceptacja projektu”:\numawiamy spotkanie projektowe i przechodzimy dom pomieszczenie po pomieszczeniu, żeby ustalić działanie systemu.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_3_projektowanie: {
      label: "Etap 3 — Projektowanie i akceptacja projektu",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Projekt zaakceptowany do realizacji”. Wyślij przed startem instalacji elektrycznej.",
      subject: "{{project_name}} — zamykamy etap: Projektowanie i akceptacja projektu",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Projektowanie i akceptacja projektu” — kamień milowy: Projekt zaakceptowany do realizacji.\n\nCo zrobiliśmy w tym etapie:\n• przeszliśmy dom pomieszczenie po pomieszczeniu i ustaliliśmy działanie systemu (przyciski, sceny, czujki, rolety, HVAC, alarm, sieć, audio, integracje),\n• nanieśliśmy poprawki po spotkaniu i przygotowaliśmy finalną dokumentację,\n• uzyskaliśmy akceptację projektu.\n\nCo dalej — etap „Instalacja elektryczna i okablowanie”:\nwybieramy wykonawcę instalacji, robimy wizję lokalną i ustalamy trasy kablowe przed realizacją.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_4_instalacja: {
      label: "Etap 4 — Instalacja elektryczna i okablowanie",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Instalacja odebrana”. Wyślij, gdy zaczyna się przerwa budowlana na tynki.",
      subject: "{{project_name}} — zamykamy etap: Instalacja elektryczna i okablowanie",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Instalacja elektryczna i okablowanie” — kamień milowy: Instalacja odebrana.\n\nCo zrobiliśmy w tym etapie:\n• wykonaliśmy instalację zgodnie z projektem, przewody są opisane i pogrupowane,\n• ustaliliśmy miejsce i sposób mocowania rozdzielni oraz szafy Rack,\n• podpisaliśmy protokół odbioru instalacji.\n\nCo dalej — etap „Koordynacja przed montażem”:\nwykorzystujemy przerwę budowlaną na kontrolę instalacji po tynkach, zamknięcie ewentualnych zmian i przygotowanie projektu do produkcji rozdzielni.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_5_koordynacja: {
      label: "Etap 5 — Koordynacja przed montażem",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Projekt zamknięty do produkcji”. Wyślij przed startem prefabrykacji.",
      subject: "{{project_name}} — zamykamy etap: Koordynacja przed montażem",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Koordynacja przed montażem” — kamień milowy: Projekt zamknięty do produkcji.\n\nCo zrobiliśmy w tym etapie:\n• sprawdziliśmy instalację po tynkach i zamknęliśmy zmiany wynikające z faktycznego okablowania,\n• ustaliliśmy i rozliczyliśmy koszty dodatkowe (Karta Zmian Projektu),\n• przygotowaliśmy projekt wykonawczy do produkcji rozdzielni i ustaliliśmy termin dostawy oraz Internet na czas uruchomienia.\n\nCo dalej — etap „Prefabrykacja rozdzielni”:\nprodukujemy i testujemy rozdzielnię oraz przygotowujemy szczegółową listę prac dla ekipy na budowie.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_6_prefabrykacja: {
      label: "Etap 6 — Prefabrykacja rozdzielni",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Rozdzielnia gotowa do montażu”. Wyślij przed transportem rozdzielni na budowę.",
      subject: "{{project_name}} — zamykamy etap: Prefabrykacja rozdzielni",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Prefabrykacja rozdzielni” — kamień milowy: Rozdzielnia gotowa do montażu.\n\nCo zrobiliśmy w tym etapie:\n• wyprodukowaliśmy kompletną rozdzielnię i sprawdziliśmy ją programem testowym,\n• nanieśliśmy poprawki do dokumentacji wykryte podczas testów,\n• przygotowaliśmy szczegółową checklistę montażową dla ekipy na budowie.\n\nCo dalej — etap „Dostawa i podłączenie rozdzielni”:\ntransportujemy, montujemy i podłączamy rozdzielnię, a po podpisaniu protokołu przekazania zaczyna biec gwarancja na urządzenia.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_7_rozdzielnia: {
      label: "Etap 7 — Dostawa i podłączenie rozdzielni",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Rozdzielnia przekazana inwestorowi”. Wyślij przed startem montaży.",
      subject: "{{project_name}} — zamykamy etap: Dostawa i podłączenie rozdzielni",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Dostawa i podłączenie rozdzielni” — kamień milowy: Rozdzielnia przekazana inwestorowi.\n\nCo zrobiliśmy w tym etapie:\n• dostarczyliśmy, ustawiliśmy i podłączyliśmy rozdzielnię, podpisaliśmy protokół przekazania,\n• przekazaliśmy aplikację i przeprowadziliśmy wstępne szkolenie,\n• od podpisania protokołu biegnie gwarancja na urządzenia, rozliczyliśmy drugą transzę (30%).\n\nCo dalej — etap „Montaże urządzeń”:\nmontujemy czujki, przyciski, panele, kamery i pozostały osprzęt, ewentualnie biały montaż.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_8_montaze: {
      label: "Etap 8 — Montaże urządzeń",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Gotowość do uruchomienia”. Wyślij przed testami funkcjonalnymi.",
      subject: "{{project_name}} — zamykamy etap: Montaże urządzeń",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Montaże urządzeń” — kamień milowy: Gotowość do uruchomienia.\n\nCo zrobiliśmy w tym etapie:\n• zamontowaliśmy wszystkie możliwe elementy systemu, opisaliśmy elementy niemożliwe do montażu wraz z przyczyną,\n• wykonaliśmy pomiary i odbiór wewnętrzny montażu.\n\nCo dalej — etap „Uruchomienie, testy i przekazanie systemu”:\nrobimy pełny odbiór wewnętrzny, testy funkcjonalne wszystkich systemów, przekazanie i szkolenie.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_9_uruchomienie_testy: {
      label: "Etap 9 — Uruchomienie, testy i przekazanie systemu",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „System przekazany inwestorowi”. Wyślij po przekazaniu i szkoleniu klienta.",
      subject: "{{project_name}} — zamykamy etap: Uruchomienie i przekazanie systemu",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Uruchomienie, testy i przekazanie systemu” — kamień milowy: System przekazany inwestorowi.\n\nCo zrobiliśmy w tym etapie:\n• wykonaliśmy pełny odbiór wewnętrzny i testy funkcjonalne wszystkich systemów,\n• zamknęliśmy usterki krytyczne i przeszkoliliśmy Państwa z obsługi,\n• uruchomiliśmy Tablicę Wdrożeniową do zgłaszania uwag w czasie użytkowania.\n\nCo dalej — etap „Optymalizacja po zamieszkaniu”:\npo 1–2 miesiącach realnego użytkowania donastroimy sceny, harmonogramy i automatykę na podstawie Państwa uwag.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Etap zamknięty",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
      smsManagedElsewhere: false,
      pushTitle: "",
      pushBody: "",
    },
    stage_dom_10_optymalizacja: {
      label: "Etap 10 — Optymalizacja po zamieszkaniu",
      description:
        "Ręczny mail po osiągnięciu kamienia milowego „Projekt zakończony i przekazany do serwisu” — formalne zamknięcie wdrożenia.",
      subject: "{{project_name}} — zamykamy wdrożenie: Optymalizacja po zamieszkaniu",
      body:
        "Dzień dobry {{client_name}},\n\nzamykamy etap „Optymalizacja po zamieszkaniu” — kamień milowy: Projekt zakończony i przekazany do serwisu.\n\nCo zrobiliśmy w tym etapie:\n• omówiliśmy uwagi zebrane na Tablicy Wdrożeniowej w okresie użytkowania,\n• wykonaliśmy uzgodnione korekty scen, harmonogramów i automatyki,\n• rozliczyliśmy ostatnią transzę (10%).\n\nCo dalej:\nto formalny koniec wdrożenia — projekt przechodzi pod opiekę działu serwisu na wypadek przyszłych zgłoszeń.\n\nCzeka na Państwa decyzję:\n{{pending_items_block}}",
      eyebrow: "Wdrożenie zakończone",
      disclaimer: "",
      emailEnabled: true,
      sms: "",
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
