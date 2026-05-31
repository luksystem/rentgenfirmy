export type FieldOptions = {
  projectTypes: string[];
  flowStatuses: string[];
  implementationStages: string[];
  nextStepOwners: string[];
  blockerReasons: string[];
  interruptionTypes: string[];
};

export type FieldOptionKey = keyof FieldOptions;

export const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  projectTypes: ["Dom", "Sklep", "Serwis", "Inne"],
  flowStatuses: [
    "Oczekuje na budowę",
    "Oczekuje na klienta",
    "Oczekuje na inną branżę",
    "Oczekuje na materiały",
    "Wdrożenie i przekazanie",
    "Poprawki",
    "Gotowy do odbioru",
    "Zamknięty",
  ],
  implementationStages: [
    "Projektowanie",
    "Przygotowanie produkcji",
    "Produkcja",
    "Dostarczenie rozdzielni",
    "Montaż",
    "Oczekiwanie po instalacji",
    "Wdrożenie i przekazanie",
  ],
  nextStepOwners: [
    "Łukasz",
    "Koordynator techniczny",
    "Lider operacyjny",
    "Programista",
    "Monter",
    "Klient",
    "Inna branża",
  ],
  blockerReasons: [
    "Tynki",
    "Wylewki",
    "Klient",
    "Elektryk",
    "HVAC",
    "Internet",
    "Brak materiału",
    "Programowanie",
    "Poprawki po naszej stronie",
    "Odbiór klienta",
    "Brak decyzji klienta",
    "Inna branża",
    "Inne",
  ],
  interruptionTypes: [
    "Telefon klienta",
    "Telefon ekipy",
    "Pytanie techniczne",
    "Zmiana projektu",
    "Problem materiałowy",
    "Serwis",
    "Reklamacja",
    "Spotkanie",
    "Inne",
  ],
};

export const FIELD_OPTION_LABELS: Record<FieldOptionKey, string> = {
  projectTypes: "Typ projektu",
  flowStatuses: "Status przepływu",
  implementationStages: "Etap",
  nextStepOwners: "Właściciel kolejnego kroku",
  blockerReasons: "Powód blokady",
  interruptionTypes: "Typ przerwania",
};

export const PROJECT_FIELD_OPTION_KEYS: FieldOptionKey[] = [
  "projectTypes",
  "flowStatuses",
  "implementationStages",
  "nextStepOwners",
  "blockerReasons",
];

export const INTERRUPTION_FIELD_OPTION_KEYS: FieldOptionKey[] = ["interruptionTypes"];

export function normalizeFieldOptions(input?: Partial<FieldOptions> | null): FieldOptions {
  const merge = (key: FieldOptionKey) => {
    const values = input?.[key]
      ?.map((value) => value.trim())
      .filter(Boolean);

    return values && values.length > 0 ? [...new Set(values)] : [...DEFAULT_FIELD_OPTIONS[key]];
  };

  return {
    projectTypes: merge("projectTypes"),
    flowStatuses: merge("flowStatuses").filter((status) => status !== "Aktywny"),
    implementationStages: merge("implementationStages"),
    nextStepOwners: merge("nextStepOwners"),
    blockerReasons: merge("blockerReasons"),
    interruptionTypes: merge("interruptionTypes"),
  };
}

export function pickOption<T extends string>(
  value: T | undefined,
  options: string[],
  fallback: string,
) {
  if (value && options.includes(value)) {
    return value;
  }

  return options.includes(fallback) ? fallback : (options[0] ?? fallback);
}

export function defaultFlowStatus(options: FieldOptions) {
  return (
    options.flowStatuses.find((status) => status !== "Aktywny") ??
    options.flowStatuses[0] ??
    "Oczekuje na budowę"
  );
}
