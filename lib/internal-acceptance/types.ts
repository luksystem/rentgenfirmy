export const INTERNAL_ACCEPTANCE_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PASSED",
  "FAILED",
  "NOT_APPLICABLE",
] as const;

export type InternalAcceptanceStatus = (typeof INTERNAL_ACCEPTANCE_STATUSES)[number];

export const INTERNAL_ACCEPTANCE_CATEGORIES = [
  "Dokumentacja",
  "Rozdzielnia",
  "Rack",
  "Sieć",
  "Oświetlenie",
  "Rolety",
  "HVAC",
  "Alarm",
  "Monitoring",
  "Wideodomofon",
  "Audio",
  "Multiroom",
  "Integracje",
  "Automatyzacje",
  "Powiadomienia",
  "Aplikacja",
  "Test użytkownika",
  "Dokumentacja powykonawcza",
  "Szkolenie",
  "Gotowość do odbioru",
] as const;

export type InternalAcceptanceCategory = (typeof INTERNAL_ACCEPTANCE_CATEGORIES)[number] | string;

export type InternalAcceptanceSourceType =
  | "specification"
  | "agreement"
  | "company_standard"
  | "document";

export type InternalAcceptancePriority = "critical" | "normal" | "optional";

export type InternalAcceptanceRuleTemplate = {
  id: string;
  name: string;
  description: string;
  category: InternalAcceptanceCategory;
  priority: InternalAcceptancePriority;
  mandatory: boolean;
};

export type InternalAcceptanceSourceRuleSet = {
  id: string;
  sourceType: InternalAcceptanceSourceType;
  /** Dopasowanie po kategorii specyfikacji / typie źródła */
  matchCategory?: string[];
  /** Dopasowanie po fragmencie tytułu (case-insensitive) */
  matchTitleContains?: string[];
  items: InternalAcceptanceRuleTemplate[];
};

export type InternalAcceptanceItemSource = {
  type: InternalAcceptanceSourceType;
  refId?: string;
  refLabel: string;
};

export type InternalAcceptanceGeneratedItem = InternalAcceptanceRuleTemplate & {
  source: InternalAcceptanceItemSource;
  /** Stabilny klucz punktu w instancji projektu */
  itemKey: string;
};

export type InternalAcceptanceItemState = InternalAcceptanceGeneratedItem & {
  status: InternalAcceptanceStatus;
  notes?: string;
  photoUrls?: string[];
  assigneeName?: string;
  completedAt?: string;
  failureReason?: string;
  fixDeadline?: string;
  fixAssignee?: string;
};

export type InternalAcceptanceQualitySummary = {
  total: number;
  passed: number;
  failed: number;
  inProgress: number;
  notStarted: number;
  notApplicable: number;
  mandatoryTotal: number;
  mandatoryPassed: number;
  criticalFailed: number;
  optionalSkipped: number;
  percentComplete: number;
  readyForClientHandover: boolean;
  blockers: string[];
};

export type InternalAcceptanceState = {
  generatedAt: string;
  items: InternalAcceptanceItemState[];
  summary: InternalAcceptanceQualitySummary;
};

export type InternalAcceptanceGenerationInput = {
  specificationItems: Array<{ id: string; title: string; category: string }>;
  agreements: Array<{ id: string; title: string; category: string; body?: string }>;
};

export const INTERNAL_ACCEPTANCE_STATUS_LABELS: Record<InternalAcceptanceStatus, string> = {
  NOT_STARTED: "Nierozpoczęte",
  IN_PROGRESS: "W trakcie",
  PASSED: "OK",
  FAILED: "Błąd",
  NOT_APPLICABLE: "N/D",
};
