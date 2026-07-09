// Etap 1 modułu Plan Zasobów — słowniki konfiguracyjne.
// Wszystkie wartości słowników są edytowalne w ustawieniach; poniżej tylko
// klucze słowników (struktura), nie ich zawartość.

export const DICTIONARY_KEYS = [
  "operational_role",
  "competency",
  "competency_level",
  "team",
  "area",
  "work_type",
  "plan_status",
  "risk_level",
  "absence_type",
  "budget_type",
  "plan_item_template",
  "leave_type",
] as const;

export type DictionaryKey = (typeof DICTIONARY_KEYS)[number];

export const DICTIONARY_LABELS: Record<DictionaryKey, string> = {
  operational_role: "Role operacyjne",
  competency: "Kompetencje",
  competency_level: "Poziomy kompetencji",
  team: "Zespoły",
  area: "Obszary",
  work_type: "Typy pracy",
  plan_status: "Statusy planu",
  risk_level: "Poziomy ryzyka",
  absence_type: "Typy nieobecności",
  budget_type: "Typy budżetów",
  plan_item_template: "Szablony elementu planu",
  leave_type: "Typy dostępności / urlopów",
};

export const DICTIONARY_DESCRIPTIONS: Record<DictionaryKey, string> = {
  operational_role: "Role przypisywane użytkownikom przy planowaniu prac (np. Instalator, Programista).",
  competency: "Umiejętności i systemy, w których użytkownicy się specjalizują.",
  competency_level: "Poziomy zaawansowania kompetencji (np. Junior, Senior).",
  team: "Zespoły, do których przypisani są użytkownicy.",
  area: "Obszary działalności wykorzystywane do klasyfikacji prac i etapów.",
  work_type: "Rodzaje prac przypisywane do elementów planu zasobów.",
  plan_status: "Statusy elementów planu zasobów (np. Planowane, W realizacji).",
  risk_level: "Poziomy ryzyka etapów i elementów planu.",
  absence_type: "Rodzaje nieobecności użytkowników (urlop, choroba, delegacja...).",
  budget_type: "Kategorie budżetowe wykorzystywane w planowaniu kosztów.",
  plan_item_template:
    "Powtarzalne gotowce elementu planu (np. „Produkcja rozdzielni”) — szybki wybór z listy zamiast wypełniania od nowa.",
  leave_type:
    "Rodzaje wniosków w module „Moja praca” → Dostępność (urlop wypoczynkowy, zwolnienie lekarskie, urlop na żądanie...). Podlegają procesowi akceptacji przez przełożonego.",
};

export type DictionaryItem = {
  id: string;
  dictionaryKey: DictionaryKey;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DictionaryItemInput = {
  dictionaryKey: DictionaryKey;
  name: string;
  description: string;
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
};

export function isDictionaryKey(value: string): value is DictionaryKey {
  return (DICTIONARY_KEYS as readonly string[]).includes(value);
}
