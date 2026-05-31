export type StageOption = {
  name: string;
  forClosing: boolean;
};

export type FlowStatusOption = {
  name: string;
  isInProgress: boolean;
  isClosed: boolean;
  isWaiting: boolean;
};

export type InterruptionTypeOption = {
  name: string;
  suggestion: string;
};

export type FieldOptions = {
  projectTypes: string[];
  flowStatuses: FlowStatusOption[];
  implementationStages: StageOption[];
  nextStepOwners: string[];
  blockerReasons: string[];
  interruptionTypes: InterruptionTypeOption[];
};

export type FieldOptionKey = keyof FieldOptions;

export type StringListFieldOptionKey = Exclude<
  FieldOptionKey,
  "implementationStages" | "flowStatuses" | "interruptionTypes"
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

const LEGACY_IN_PROGRESS_STATUS_NAMES = new Set([
  "Wdrożenie i przekazanie",
  "Poprawki",
  "Gotowy do odbioru",
]);

const DEFAULT_FLOW_STATUS_OPTIONS: FlowStatusOption[] = [
  { name: "Oczekuje na budowę", isInProgress: false, isClosed: false, isWaiting: true },
  { name: "Oczekuje na klienta", isInProgress: false, isClosed: false, isWaiting: true },
  { name: "Oczekuje na inną branżę", isInProgress: false, isClosed: false, isWaiting: true },
  { name: "Oczekuje na materiały", isInProgress: false, isClosed: false, isWaiting: true },
  { name: "Wdrożenie i przekazanie", isInProgress: true, isClosed: false, isWaiting: false },
  { name: "Poprawki", isInProgress: true, isClosed: false, isWaiting: false },
  { name: "Gotowy do odbioru", isInProgress: true, isClosed: false, isWaiting: false },
  { name: "Zamknięty", isInProgress: false, isClosed: true, isWaiting: false },
];

const LEGACY_INTERRUPTION_SUGGESTIONS: Record<string, string> = {
  "Telefon klienta":
    "Ustal stałe okno na telefony klientów i szablon odpowiedzi na powtarzalne pytania.",
  "Telefon ekipy":
    "Wprowadź krótki stand-up z ekipą zamiast ad hoc telefonów w ciągu dnia.",
  "Pytanie techniczne":
    "Zbierz FAQ techniczne i przypisz jedną osobę jako pierwszą linię wsparcia.",
  "Zmiana projektu":
    "Wymagaj krótkiego briefu mailowego przed każdą zmianą zakresu.",
  "Problem materiałowy":
    "Przegląd stanu magazynowego raz w tygodniu dla aktywnych projektów.",
  Serwis: "Wydziel osobny slot serwisowy zamiast reagowania natychmiast.",
  Reklamacja: "Checklista odbioru przed zamknięciem projektu ograniczy reklamacje.",
  Spotkanie: "Ogranicz spotkania do projektów krytycznych i do zamknięcia.",
  Inne: "Ustal właściciela i procedurę dla tego typu przerwań.",
};

const DEFAULT_INTERRUPTION_TYPE_OPTIONS: InterruptionTypeOption[] = [
  {
    name: "Telefon klienta",
    suggestion: LEGACY_INTERRUPTION_SUGGESTIONS["Telefon klienta"],
  },
  {
    name: "Telefon ekipy",
    suggestion: LEGACY_INTERRUPTION_SUGGESTIONS["Telefon ekipy"],
  },
  {
    name: "Pytanie techniczne",
    suggestion: LEGACY_INTERRUPTION_SUGGESTIONS["Pytanie techniczne"],
  },
  {
    name: "Zmiana projektu",
    suggestion: LEGACY_INTERRUPTION_SUGGESTIONS["Zmiana projektu"],
  },
  {
    name: "Problem materiałowy",
    suggestion: LEGACY_INTERRUPTION_SUGGESTIONS["Problem materiałowy"],
  },
  { name: "Serwis", suggestion: LEGACY_INTERRUPTION_SUGGESTIONS.Serwis },
  { name: "Reklamacja", suggestion: LEGACY_INTERRUPTION_SUGGESTIONS.Reklamacja },
  { name: "Spotkanie", suggestion: LEGACY_INTERRUPTION_SUGGESTIONS.Spotkanie },
  { name: "Inne", suggestion: LEGACY_INTERRUPTION_SUGGESTIONS.Inne },
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
  interruptionTypes: DEFAULT_INTERRUPTION_TYPE_OPTIONS,
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

function normalizeInterruptionTypeOptions(input?: unknown): InterruptionTypeOption[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_INTERRUPTION_TYPE_OPTIONS.map((item) => ({ ...item }));
  }

  if (typeof input[0] === "string") {
    return input
      .map((value) => {
        const name = String(value).trim();
        return name
          ? {
              name,
              suggestion: LEGACY_INTERRUPTION_SUGGESTIONS[name] ?? "",
            }
          : null;
      })
      .filter((item): item is InterruptionTypeOption => item !== null);
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
      const suggestion =
        "suggestion" in value
          ? String(value.suggestion ?? "").trim()
          : LEGACY_INTERRUPTION_SUGGESTIONS[name] ?? "";

      return { name, suggestion };
    })
    .filter((item): item is InterruptionTypeOption => item !== null);
}

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

        const isClosed = name === "Zamknięty";
        const isWaiting = LEGACY_WAITING_STATUS_NAMES.has(name);

        return {
          name,
          isInProgress: !isClosed && !isWaiting && LEGACY_IN_PROGRESS_STATUS_NAMES.has(name),
          isClosed,
          isWaiting,
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
      const isClosed = Boolean((value as FlowStatusOption).isClosed);
      const isWaiting = Boolean((value as FlowStatusOption).isWaiting);
      const isInProgress =
        "isInProgress" in value
          ? Boolean((value as FlowStatusOption).isInProgress)
          : !isClosed && !isWaiting;

      return {
        name,
        isInProgress,
        isClosed,
        isWaiting,
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
    interruptionTypes: normalizeInterruptionTypeOptions(input?.interruptionTypes),
  };
}

export function interruptionTypeNames(options: FieldOptions): string[] {
  return options.interruptionTypes.map((item) => item.name);
}

export function defaultInterruptionTypeName(options: FieldOptions) {
  return interruptionTypeNames(options)[0] ?? "Telefon klienta";
}

export function defaultNextStepOwner(options: FieldOptions) {
  return options.nextStepOwners[0] ?? "Łukasz";
}

export function getInterruptionTypeSuggestion(typeName: string, options: FieldOptions) {
  const suggestion = options.interruptionTypes.find((item) => item.name === typeName)?.suggestion;

  if (suggestion?.trim()) {
    return suggestion.trim();
  }

  return "Ustal właściciela i procedurę dla tego typu przerwań.";
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

export function isInProgressFlowStatus(status: string, options: FieldOptions) {
  return options.flowStatuses.find((item) => item.name === status)?.isInProgress ?? false;
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

export function isProjectInProgress(
  project: { flowStatus: string },
  options: FieldOptions,
) {
  return isInProgressFlowStatus(project.flowStatus, options);
}

export function isProjectForClosing(
  project: { flowStatus: string; stage: string },
  options: FieldOptions,
) {
  return (
    isInProgressFlowStatus(project.flowStatus, options) &&
    isClosingStage(project.stage, options)
  );
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

export function getDefaultInterruptionTypeOptions() {
  return DEFAULT_INTERRUPTION_TYPE_OPTIONS.map((item) => ({ ...item }));
}
