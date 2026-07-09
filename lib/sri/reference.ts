// Referencyjny, deterministyczny scenariusz audytu (do podglądu i testów).
// Budynek niemieszkalny, strefa north_europe, zróżnicowana dojrzałość domen.
import { getServices } from "@/lib/sri/artifacts";
import type { AssessmentInput } from "@/lib/audit/types";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

// Względny poziom wdrożenia smart per domena (0..1) — symuluje realny, częściowo smart budynek.
const DOMAIN_MATURITY: Record<string, number> = {
  heating: 0.75,
  lighting: 0.8,
  monitoring_and_control: 0.7,
  ventilation: 0.5,
  cooling: 0.5,
  domestic_hot_water: 0.4,
  electricity: 0.45,
  dynamic_building_envelope: 0.25,
  electric_vehicle_charging: 0.3,
};

export function buildReferenceAssessment(versionId = DEFAULT_METHODOLOGY_ID): AssessmentInput {
  const services = getServices(versionId);
  const svc: Record<string, number> = {};
  for (const s of services) {
    const ratio = DOMAIN_MATURITY[s.domain_code] ?? 0.5;
    svc[s.official_code] = Math.min(s.fl_max, Math.round(s.fl_max * ratio));
  }
  return {
    methodology_version_id: versionId,
    building_type: "non_residential",
    climate_zone: "north_europe",
    services: svc,
  };
}
