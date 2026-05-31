export type StageOption = {
  name: string;
  forClosing: boolean;
};

export type FlowStatusOption = {
  name: string;
  isClosed: boolean;
  isWaiting: boolean;
};

export type FieldOptions = {
  projectTypes: string[];
  flowStatuses: FlowStatusOption[];
  implementationStages: StageOption[];
  nextStepOwners: string[];
  blockerReasons: string[];
  interruptionTypes: string[];
};

export type FieldOptionKey = keyof FieldOptions;

export type StringListFieldOptionKey = Exclude<
  FieldOptionKey,
  "implementationStages" | "flowStatuses"
>;

const DEFAULT_STAGE_OPTIONS: StageOption[] = [
  { name: "Projektowanie", forClosing: false },
  { name: "Przygotowanie produkcji", forClosing: false },
  { name: "Produkcja", forClosing: false },
  { name: "Dostarczenie rozdzielni", forClosing: false },
  { name: "Montaż", forClosing: false },
  { name: "Oczekiwanie po instalacji", forClosing: false },
  { name: "Wdrożenie i przekazanie", forClosing: true },
];

const LEGACY_WAITING_STATUS_NAMES = new Set([
  "Oczekuje na budowę",
  "Oczekuje na klienta",
  "Oczekuje na inną branżę",
  "Oczekuje na materiały",
]);

const DEFAULT_FLOW_STATUS_OPTIONS: FlowStatusOption[] = [
  { name: "Oczekuje na budowę", isClosed: false, isWaiting: true },
  { name: "Oczekuje na klienta", isClosed: false, isWaiting: true },
  { name: "Oczekuje na inną branżę", isClosed: false, isWaiting: true },
  { name: "Oczekuje na materiały", isClosed: false, isWaiting: true },
  { name: "Wdrożenie i przekazanie", isClosed: false, isWaiting: false },
  { name: "Poprawki", isClosed: false, isWaiting: false },
  { name: "Gotowy do odbioru", isClosed: false, isWaiting: false },
  { name: "Zamknięty", isClosed: true, isWaiting: false },
];

export const DEFAULT_FIELD_OPTIONS: FieldOptions = {
  projectTypes: ["Dom", "Sklep", "Serwis", "Inne"],
  flowStatuses: DEFAULT_FLOW_STATUS_OPTIONS,
  implementationStages: DEFAULT_STAGE_OPTIONS,
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

export const PROJECT_STRING_FIELD_OPTION_KEYS: StringListFieldOptionKey[] = [
  "projectTypes",
  "nextStepOwners",
  "blockerReasons",
];

export const PROJECT_FIELD_OPTION_KEYS: FieldOptionKey[] = [
  ...PROJECT_STRING_FIELD_OPTION_KEYS,
  "flowStatuses",
  "implementationStages",
];

export const INTERRUPTION_FIELD_OPTION_KEYS: StringListFieldOptionKey[] = [
  "interruptionTypes",
];

function normalizeStageOptions(input?: unknown): StageOption[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_STAGE_OPTIONS.map((stage) => ({ ...stage }));
  }

  if (typeof input[0] === "string") {
    const legacyClosingNames = new Set([
      "Wdrożenie i przekazanie",
      "Poprawki",
      "Gotowy do odbioru",
    ]);

    return input
      .map((value) => {
        const name = String(value).trim();
        return name
          ? {
              name,
              forClosing: legacyClosingNames.has(name),
            }
          : null;
      })
      .filter((stage): stage is StageOption => stage !== null);
  }

  const seen = new Set<string>();

  return input
    .map((value) => {
      if (!value || typeof value !== "object" || !("name" in value)) {
        return null;
      }

      const name = String(value.name).trim();
      if (!name || seen.has(name)) {
        return null;
      }

      seen.add(name);
      return {
        name,
        forClosing: Boolean((value as StageOption).forClosing),
      };
    })
    .filter((stage): stage is StageOption => stage !== null);
}

function normalizeFlowStatusOptions(input?: unknown): FlowStatusOption[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_FLOW_STATUS_OPTIONS.map((status) => ({ ...status }));
  }

  if (typeof input[0] === "string") {
    return input
      .map((value) => {
        const name = String(value).trim();
        if (!name || name === "Aktywny") {
          return null;
        }

        return {
          name,
          isClosed: name === "Zamknięty",
          isWaiting: LEGACY_WAITING_STATUS_NAMES.has(name),
        };
      })
      .filter((status): status is FlowStatusOption => status !== null);
  }

  const seen = new Set<string>();

  return input
    .map((value) => {
      if (!value || typeof value !== "object" || !("name" in value)) {
        return null;
      }

      const name = String(value.name).trim();
      if (!name || name === "Aktywny" || seen.has(name)) {
        return null;
      }

      seen.add(name);
      return {
        name,
        isClosed: Boolean((value as FlowStatusOption).isClosed),
        isWaiting: Boolean((value as FlowStatusOption).isWaiting),
      };
    })
    .filter((status): status is FlowStatusOption => status !== null);
}

export function normalizeFieldOptions(input?: Partial<FieldOptions> | null): FieldOptions {
  const merge = (key: StringListFieldOptionKey) => {
    const values = input?.[key]
      ?.map((value) => value.trim())
      .filter(Boolean);

    return values && values.length > 0 ? [...new Set(values)] : [...DEFAULT_FIELD_OPTIONS[key]];
  };

  return {
    projectTypes: merge("projectTypes"),
    flowStatuses: normalizeFlowStatusOptions(input?.flowStatuses),
    implementationStages: normalizeStageOptions(input?.implementationStages),
    nextStepOwners: merge("nextStepOwners"),
    blockerReasons: merge("blockerReasons"),
    interruptionTypes: merge("interruptionTypes"),
  };
}

export function stageNames(options: FieldOptions): string[] {
  return options.implementationStages.map((stage) => stage.name);
}

export function flowStatusNames(options: FieldOptions): string[] {
  return options.flowStatuses.map((status) => status.name);
}

export function defaultStageName(options: FieldOptions) {
  return stageNames(options)[0] ?? "Projektowanie";
}

export function defaultFlowStatus(options: FieldOptions) {
  return (
    flowStatusNames(options).find((status) => !isClosedFlowStatus(status, options)) ??
    flowStatusNames(options)[0] ??
    "Oczekuje na budowę"
  );
}

export function isClosingStage(stage: string, options: FieldOptions) {
  return (
    options.implementationStages.find((item) => item.name === stage)?.forClosing ?? false
  );
}

export function isClosedFlowStatus(status: string, options: FieldOptions) {
  return options.flowStatuses.find((item) => item.name === status)?.isClosed ?? false;
}

export function isWaitingFlowStatus(status: string, options: FieldOptions) {
  return options.flowStatuses.find((item) => item.name === status)?.isWaiting ?? false;
}

export function isProjectWaiting(
  project: { flowStatus: string },
  options: FieldOptions,
) {
  return isWaitingFlowStatus(project.flowStatus, options);
}

export function isProjectClosed(
  project: { flowStatus: string },
  options: FieldOptions,
) {
  return isClosedFlowStatus(project.flowStatus, options);
}

export function isProjectForClosing(
  project: { isActive: boolean; stage: string },
  options: FieldOptions,
) {
  return project.isActive && isClosingStage(project.stage, options);
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

export function getDefaultOptionsForKey(key: StringListFieldOptionKey) {
  return [...DEFAULT_FIELD_OPTIONS[key]];
}

export function getDefaultStageOptions() {
  return DEFAULT_STAGE_OPTIONS.map((stage) => ({ ...stage }));
}

export function getDefaultFlowStatusOptions() {
  return DEFAULT_FLOW_STATUS_OPTIONS.map((status) => ({ ...status }));
}
