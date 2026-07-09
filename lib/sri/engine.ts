// Silnik obliczeniowy SRI (port 1:1 z store/SRI/engine/sri_engine.py::compute_sri).
// Metodologicznie neutralny — całość danych z artefaktów generated/<version>/.
import {
  getServices,
  getImpactScores,
  getDomainWeights,
  getCriterionWeights,
  getClassBands,
  getCriteria,
} from "@/lib/sri/artifacts";
import type { AssessmentInput, CalculationResult } from "@/lib/audit/types";
import { BUILDING_TYPES, CLIMATE_ZONES } from "@/lib/audit/types";

export const SRI_ENGINE_VERSION = "1.0.0";

type CatalogueMaps = {
  criteria: string[];
  serviceDomain: Record<string, string>;
  serviceFlmax: Record<string, number>;
  serviceNameEn: Record<string, string>;
  levelScores: Record<string, Record<number, Record<string, number>>>;
  maxScores: Record<string, Record<string, number>>;
  domainWeight: Map<string, number>; // key: bt|zone|domain|ic
  critWeight: Map<string, number>; // key: bt|ic
  bands: Array<{ class_number: number; label: string; score_min_percent: number; score_max_percent: number }>;
};

const cached: Record<string, CatalogueMaps> = {};

function buildMaps(versionId: string): CatalogueMaps {
  if (cached[versionId]) return cached[versionId];

  const criteria = getCriteria(versionId);
  const services = getServices(versionId);
  const scores = getImpactScores(versionId);

  const serviceDomain: Record<string, string> = {};
  const serviceFlmax: Record<string, number> = {};
  const serviceNameEn: Record<string, string> = {};
  for (const s of services) {
    serviceDomain[s.official_code] = s.domain_code;
    serviceFlmax[s.official_code] = s.fl_max;
    serviceNameEn[s.official_code] = s.official_name_en;
  }

  const levelScores: Record<string, Record<number, Record<string, number>>> = {};
  const maxScores: Record<string, Record<string, number>> = {};
  for (const [code, rows] of Object.entries(scores)) {
    const byLevel: Record<number, Record<string, number>> = {};
    for (const r of rows) {
      const perIc: Record<string, number> = {};
      for (const ic of criteria) perIc[ic] = Math.round(Number(r.scores[ic] ?? 0));
      byLevel[r.level] = perIc;
    }
    levelScores[code] = byLevel;
    const flmax = serviceFlmax[code];
    maxScores[code] =
      byLevel[flmax] ?? Object.fromEntries(criteria.map((ic) => [ic, 0]));
  }

  const domainWeight = new Map<string, number>();
  for (const w of getDomainWeights(versionId)) {
    domainWeight.set(
      `${w.building_type}|${w.climate_zone}|${w.domain_code}|${w.impact_criterion_code}`,
      w.weight,
    );
  }
  const critWeight = new Map<string, number>();
  for (const w of getCriterionWeights(versionId)) {
    critWeight.set(`${w.building_type}|${w.impact_criterion_code}`, w.weight);
  }

  const bands = [...getClassBands(versionId)].sort((a, b) => a.class_number - b.class_number);

  cached[versionId] = {
    criteria,
    serviceDomain,
    serviceFlmax,
    serviceNameEn,
    levelScores,
    maxScores,
    domainWeight,
    critWeight,
    bands,
  };
  return cached[versionId];
}

function classify(maps: CatalogueMaps, percent: number): { label: string; number: number } {
  for (const b of maps.bands) {
    const inBand =
      (percent >= b.score_min_percent && percent < b.score_max_percent) ||
      (b.class_number === 1 && percent >= b.score_min_percent);
    if (inBand) return { label: b.label, number: b.class_number };
  }
  return { label: "?", number: 0 };
}

export function validateAssessment(input: AssessmentInput): string[] {
  const maps = buildMaps(input.methodology_version_id);
  const errors: string[] = [];
  if (!BUILDING_TYPES.includes(input.building_type as never))
    errors.push(`Nieprawidłowy building_type: ${input.building_type}`);
  if (!CLIMATE_ZONES.includes(input.climate_zone as never))
    errors.push(`Nieprawidłowa climate_zone: ${input.climate_zone}`);
  const svcs = input.services ?? {};
  if (Object.keys(svcs).length === 0) errors.push("Brak usług w ocenie (services jest puste).");
  for (const [code, level] of Object.entries(svcs)) {
    if (!(code in maps.serviceDomain)) {
      errors.push(`Nieznany kod usługi: ${code}`);
      continue;
    }
    if (!Number.isInteger(level)) {
      errors.push(`${code}: poziom musi być liczbą całkowitą`);
      continue;
    }
    const flmax = maps.serviceFlmax[code];
    if (level < 0) errors.push(`${code}: poziom ujemny (${level})`);
    else if (level > flmax) errors.push(`${code}: poziom ${level} przekracza FLmax=${flmax}`);
    else if (!(level in (maps.levelScores[code] ?? {})))
      errors.push(`${code}: brak impact scores dla poziomu ${level}`);
  }
  return errors;
}

export function compute(input: AssessmentInput): CalculationResult {
  const maps = buildMaps(input.methodology_version_id);
  const { criteria } = maps;
  const bt = input.building_type;
  const zone = input.climate_zone;
  const svcs = input.services;

  // grupowanie usług po domenach
  const byDomain: Record<string, Record<string, number>> = {};
  for (const [code, level] of Object.entries(svcs)) {
    const d = maps.serviceDomain[code];
    (byDomain[d] ??= {})[code] = level;
  }
  const presentDomains = Object.keys(byDomain).sort();

  // achieved / maxposs per (domena, kryterium)
  const achieved = new Map<string, number>();
  const maxposs = new Map<string, number>();
  for (const [d, servicesInDomain] of Object.entries(byDomain)) {
    for (const ic of criteria) {
      let a = 0;
      let m = 0;
      for (const [code, level] of Object.entries(servicesInDomain)) {
        a += maps.levelScores[code][level][ic];
        m += maps.maxScores[code][ic];
      }
      achieved.set(`${d}|${ic}`, a);
      maxposs.set(`${d}|${ic}`, m);
    }
  }

  // SR(ic) z renormalizacją wag domen wnoszących wkład
  const srIc: Record<string, number> = {};
  for (const ic of criteria) {
    const contributing = presentDomains.filter((d) => (maxposs.get(`${d}|${ic}`) ?? 0) > 0);
    const rawW: Record<string, number> = {};
    let totalW = 0;
    for (const d of contributing) {
      const w = maps.domainWeight.get(`${bt}|${zone}|${d}|${ic}`) ?? 0;
      rawW[d] = w;
      totalW += w;
    }
    let sr = 0;
    for (const d of contributing) {
      const normW = totalW > 0 ? rawW[d] / totalW : 0;
      const ratio = (achieved.get(`${d}|${ic}`) ?? 0) / (maxposs.get(`${d}|${ic}`) ?? 1);
      sr += normW * ratio;
    }
    srIc[ic] = sr;
  }

  // SRI całkowity
  let total = 0;
  for (const ic of criteria) {
    const wf = maps.critWeight.get(`${bt}|${ic}`) ?? 0;
    total += wf * srIc[ic];
  }
  const percent = total * 100;
  const cls = classify(maps, percent);

  const perDomain: CalculationResult["per_domain"] = {};
  for (const [key, a] of achieved.entries()) {
    const [d, ic] = key.split("|");
    (perDomain[d] ??= {})[ic] = { achieved: a, maxposs: maxposs.get(key) ?? 0 };
  }
  const perService: CalculationResult["per_service"] = {};
  for (const [code, level] of Object.entries(svcs)) {
    perService[code] = { fl: level, fl_max: maps.serviceFlmax[code] };
  }

  return {
    methodology_version_id: input.methodology_version_id,
    engine_version: SRI_ENGINE_VERSION,
    total_score_percent: Math.round(percent * 10000) / 10000,
    class: cls,
    per_domain: perDomain,
    per_criterion: srIc,
    per_service: perService,
    warnings: [],
  };
}
