// Typy domenowe audytu (MVP) + kontrakty zamrożone AssessmentInput / CalculationResult.

export const AUDIT_STATUSES = [
  "draft",
  "methodology_selected",
  "in_progress",
  "completed",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const BUILDING_TYPES = ["residential", "non_residential"] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export const CLIMATE_ZONES = [
  "north_europe",
  "south_europe",
  "west_europe",
  "north_east_europe",
  "south_east_europe",
] as const;
export type ClimateZone = (typeof CLIMATE_ZONES)[number];

export const DEFAULT_METHODOLOGY_ID = "eu-sri-v4.5";

export type MethodologyOption = { id: string; label: string };

export const METHODOLOGIES: MethodologyOption[] = [
  { id: DEFAULT_METHODOLOGY_ID, label: "SRI (EU 2020/2155) v4.5" },
];

export type AuditSession = {
  id: string;
  ownerId: string;
  name: string;
  status: AuditStatus;
  methodologyVersionId: string | null;
  buildingType: BuildingType | null;
  climateZone: ClimateZone | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvidence = {
  id: string;
  questionCode: string | null;
  caption: string | null;
  storagePath: string;
  contentType: string | null;
  createdAt: string;
};

// --- Kontrakty zamrożone (zgodne z schemas/assessment-input + calculation-result) ---

export type AssessmentInput = {
  methodology_version_id: string;
  building_type: string;
  climate_zone: string;
  services: Record<string, number>;
};

export type CalculationResult = {
  methodology_version_id: string;
  engine_version: string;
  total_score_percent: number;
  class: { label: string; number: number };
  per_domain: Record<string, Record<string, { achieved: number; maxposs: number }>>;
  per_criterion: Record<string, number>;
  per_service: Record<string, { fl: number; fl_max: number }>;
  warnings: string[];
};

// --- Pytania generowane z metodologii ---

export type QuestionLevel = { level: number; descriptionEn: string | null };

export type AuditQuestion = {
  code: string;
  domain: string;
  domainNamePl: string;
  namePl: string;
  nameEn: string;
  flMax: number;
  levels: QuestionLevel[];
};

// --- Wyniki silników rekomendacji / optymalizacji ---

export type AuditRecommendation = {
  code: string;
  namePl: string;
  nameEn: string;
  domain: string;
  domainPl: string;
  currentLevel: number;
  targetLevel: number;
  priority: string;
  priorityScore: number;
  rank: number;
  expectedGainPercent: number;
  gapDescription: string;
  capabilities: string[];
};

export type RoadmapStage = {
  stageId: number;
  name: string;
  description: string;
  actions: Array<{
    code: string;
    namePl: string;
    domainPl: string;
    priority: string;
    expectedGainPercent: number;
  }>;
};
