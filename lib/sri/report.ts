// Złożenie raportu z zapisanych wyników silników.
import type {
  AuditSession,
  CalculationResult,
  AuditRecommendation,
  RoadmapStage,
} from "@/lib/audit/types";

export type AuditReport = {
  session: {
    id: string;
    name: string;
    methodologyVersionId: string | null;
    buildingType: string | null;
    climateZone: string | null;
  };
  calculation: CalculationResult;
  recommendations: AuditRecommendation[];
  roadmap: RoadmapStage[];
};

export function buildReport(
  session: AuditSession,
  calculation: CalculationResult,
  recommendations: AuditRecommendation[],
  roadmap: RoadmapStage[],
): AuditReport {
  return {
    session: {
      id: session.id,
      name: session.name,
      methodologyVersionId: session.methodologyVersionId,
      buildingType: session.buildingType,
      climateZone: session.climateZone,
    },
    calculation,
    recommendations,
    roadmap,
  };
}
