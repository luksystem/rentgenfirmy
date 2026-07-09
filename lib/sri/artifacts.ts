// Loader wersjonowanych artefaktów SRI z generated/<version>/** (runtime nodejs).
// Czyta koperty { provenance, payload }, zwraca payload; cache modułowy per plik.
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

const GENERATED_ROOT = path.join(process.cwd(), "generated");

const cache = new Map<string, unknown>();

function loadEnvelopePayload<T>(versionId: string, ...parts: string[]): T {
  const key = [versionId, ...parts].join("/");
  if (!cache.has(key)) {
    const filePath = path.join(GENERATED_ROOT, versionId, ...parts);
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as { payload: T };
    cache.set(key, parsed.payload);
  }
  return cache.get(key) as T;
}

// --- Typy payloadów (tylko pola używane w runtime) ---

export type ServiceLevel = {
  level: number;
  official_description_en: string | null;
};

export type ServiceEntry = {
  official_code: string;
  domain_code: string;
  official_name_en: string;
  official_name_pl: string;
  fl_max: number;
  sort_order: number;
  functionality_levels: ServiceLevel[];
};

type ServicesPayload = { services: ServiceEntry[] };
type ScoreRow = { level: number; scores: Record<string, number> };
type ScoresPayload = { scores_by_service: Record<string, ScoreRow[]> };
type DomainWeight = {
  building_type: string;
  climate_zone: string;
  domain_code: string;
  impact_criterion_code: string;
  weight: number;
};
type CriterionWeight = {
  building_type: string;
  impact_criterion_code: string;
  weight: number;
};
type ClassBand = {
  class_number: number;
  label: string;
  score_min_percent: number;
  score_max_percent: number;
};
type ImpactCriterion = { code: string; sort_order: number };
type DomainEntry = { code: string; sort_order: number; official_name_pl: string };

export type RecommendationEntry = {
  code: string;
  domain: string;
  domain_pl: string;
  name_pl: string;
  name_en: string;
  fl_max: number;
  gap_description: string;
  priority: { level: string; score: number };
  ranking: { rank: number };
  expected_improvement: { total_expected_gain_percent: number };
  technical_recommendation: {
    target_level: number;
    functions_to_implement: Array<{ capability: string }>;
  };
};

type RecommendationGraph = { recommendations: Record<string, RecommendationEntry> };
type OptimizationStage = { id: number; name: string; description: string };
type OptimizationRules = {
  stages: OptimizationStage[];
  capability_stage: Record<string, number>;
};

// --- Publiczne gettery ---

export function getServices(versionId = DEFAULT_METHODOLOGY_ID): ServiceEntry[] {
  return loadEnvelopePayload<ServicesPayload>(versionId, "catalogue", "services.json").services;
}

export function getImpactScores(versionId = DEFAULT_METHODOLOGY_ID) {
  return loadEnvelopePayload<ScoresPayload>(versionId, "catalogue", "impact-scores.json")
    .scores_by_service;
}

export function getDomainWeights(versionId = DEFAULT_METHODOLOGY_ID): DomainWeight[] {
  return loadEnvelopePayload<{ weights: DomainWeight[] }>(
    versionId,
    "catalogue",
    "domain-weights.json",
  ).weights;
}

export function getCriterionWeights(versionId = DEFAULT_METHODOLOGY_ID): CriterionWeight[] {
  return loadEnvelopePayload<{ weights: CriterionWeight[] }>(
    versionId,
    "catalogue",
    "criterion-weights.json",
  ).weights;
}

export function getClassBands(versionId = DEFAULT_METHODOLOGY_ID): ClassBand[] {
  return loadEnvelopePayload<{ bands: ClassBand[] }>(versionId, "catalogue", "class-bands.json")
    .bands;
}

export function getCriteria(versionId = DEFAULT_METHODOLOGY_ID): string[] {
  const ic = loadEnvelopePayload<ImpactCriterion[]>(versionId, "catalogue", "impact-criteria.json");
  return [...ic].sort((a, b) => a.sort_order - b.sort_order).map((c) => c.code);
}

export function getDomainsPl(versionId = DEFAULT_METHODOLOGY_ID): Record<string, string> {
  const domains = loadEnvelopePayload<DomainEntry[]>(versionId, "catalogue", "domains.json");
  const map: Record<string, string> = {};
  for (const d of domains) map[d.code] = d.official_name_pl;
  return map;
}

export function getRecommendationGraph(
  versionId = DEFAULT_METHODOLOGY_ID,
): Record<string, RecommendationEntry> {
  return loadEnvelopePayload<RecommendationGraph>(versionId, "recommendation-graph.json")
    .recommendations;
}

export function getOptimizationRules(versionId = DEFAULT_METHODOLOGY_ID): OptimizationRules {
  return loadEnvelopePayload<OptimizationRules>(versionId, "optimization-rules.json");
}
