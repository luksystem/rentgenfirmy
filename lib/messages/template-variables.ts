import type { SmsRuleTrigger } from "@/lib/sms/sms-rules";

export type MessageTemplateVariableCategory = "dane" | "linki";

export type MessageTemplateVariable = {
  key: string;
  label: string;
  description: string;
  category: MessageTemplateVariableCategory;
  /** Puste, gdy brak danych w kontekście wysyłki. */
  triggers: SmsRuleTrigger[];
  example?: string;
};

export const MESSAGE_TEMPLATE_VARIABLES: MessageTemplateVariable[] = [
  {
    key: "fullName",
    label: "Imię i nazwisko",
    description: "Pełne imię i nazwisko odbiorcy.",
    category: "dane",
    triggers: ["client_created", "user_created"],
    example: "Jan Kowalski",
  },
  {
    key: "firstName",
    label: "Imię",
    description: "Imię użytkownika aplikacji.",
    category: "dane",
    triggers: ["user_created"],
    example: "Jan",
  },
  {
    key: "lastName",
    label: "Nazwisko",
    description: "Nazwisko użytkownika aplikacji.",
    category: "dane",
    triggers: ["user_created"],
    example: "Kowalski",
  },
  {
    key: "email",
    label: "Adres e-mail",
    description: "E-mail klienta lub użytkownika.",
    category: "dane",
    triggers: ["client_created", "user_created"],
    example: "jan@example.com",
  },
  {
    key: "phone",
    label: "Telefon",
    description: "Numer telefonu odbiorcy.",
    category: "dane",
    triggers: ["client_created", "user_created"],
    example: "+48 600 100 200",
  },
  {
    key: "location",
    label: "Obiekt / lokalizacja",
    description: "Lokalizacja klienta z bazy Klientów.",
    category: "dane",
    triggers: ["client_created"],
    example: "Warszawa, Wilanów",
  },
  {
    key: "appUrl",
    label: "Adres aplikacji",
    description: "Główny adres URL aplikacji (bez ścieżki).",
    category: "linki",
    triggers: ["client_created", "user_created"],
    example: "https://app.example.com",
  },
  {
    key: "loginUrl",
    label: "Link do logowania",
    description: "Strona logowania do aplikacji.",
    category: "linki",
    triggers: ["user_created"],
    example: "https://app.example.com/logowanie",
  },
  {
    key: "passwordSetupUrl",
    label: "Link ustawienia hasła",
    description: "Strona, na którą trafia użytkownik po zaproszeniu e-mailem.",
    category: "linki",
    triggers: ["user_created"],
    example: "https://app.example.com/konto/haslo",
  },
  {
    key: "employeeSpaceUrl",
    label: "Publiczna przestrzeń pracownika",
    description:
      "Link do publicznej przestrzeni pracownika (/przestrzeń/…). Wymaga włączenia linku publicznego w ustawieniach przestrzeni.",
    category: "linki",
    triggers: ["user_created"],
    example: "https://app.example.com/przestrzen/abc123",
  },
  {
    key: "clientSpaceUrl",
    label: "Publiczna przestrzeń klienta",
    description:
      "Pierwszy dostępny link publiczny do dashboardu klienta. Pusty, jeśli klient nie ma jeszcze projektu z włączonym linkiem.",
    category: "linki",
    triggers: ["client_created"],
    example: "https://app.example.com/przestrzen/xyz789",
  },
  {
    key: "kanbanUrl",
    label: "Publiczna tablica Kanban projektu",
    description:
      "Link do publicznej tablicy wdrożeniowej projektu. Pusty w automatycznych regułach bez kontekstu projektu — gotowy pod przyszłe reguły.",
    category: "linki",
    triggers: ["client_created", "user_created"],
    example: "https://app.example.com/kanban/token123",
  },
  {
    key: "teamSpaceUrl",
    label: "Publiczna przestrzeń zespołu projektu",
    description:
      "Link do publicznej przestrzeni zespołu dla projektu. Pusty bez kontekstu projektu w wysyłce.",
    category: "linki",
    triggers: ["user_created"],
    example: "https://app.example.com/przestrzen/team456",
  },
];

export function formatMessageTemplateToken(key: string) {
  return `{{${key}}}`;
}

export function getTemplateVariablesForTrigger(trigger: SmsRuleTrigger) {
  return MESSAGE_TEMPLATE_VARIABLES.filter((variable) => variable.triggers.includes(trigger));
}

export function getTemplateVariableKeysForTrigger(trigger: SmsRuleTrigger) {
  return getTemplateVariablesForTrigger(trigger).map((variable) => variable.key);
}

export const MESSAGE_TEMPLATE_CATEGORY_LABELS: Record<MessageTemplateVariableCategory, string> = {
  dane: "Dane odbiorcy",
  linki: "Linki do wklejenia",
};
