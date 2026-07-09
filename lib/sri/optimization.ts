// Optimization Engine (runtime) — przypisuje rekomendacje do 5 etapów modernizacji
// na podstawie mapy capability -> stage (generated/optimization-rules.json) i buduje roadmapę.
import { getOptimizationRules } from "@/lib/sri/artifacts";
import type { AuditRecommendation, RoadmapStage } from "@/lib/audit/types";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

function stageForRecommendation(
  rec: AuditRecommendation,
  capabilityStage: Record<string, number>,
): number {
  const stages = rec.capabilities
    .map((c) => capabilityStage[c])
    .filter((s): s is number => typeof s === "number");
  // etap wejścia = najniższy wymagany etap (od czego zacząć); domyślnie 3 (fundament+)
  return stages.length > 0 ? Math.min(...stages) : 3;
}

export function buildRoadmap(
  recommendations: AuditRecommendation[],
  versionId = DEFAULT_METHODOLOGY_ID,
): RoadmapStage[] {
  const rules = getOptimizationRules(versionId);
  const capabilityStage = rules.capability_stage ?? {};

  const byStage = new Map<number, AuditRecommendation[]>();
  for (const rec of recommendations) {
    const stageId = stageForRecommendation(rec, capabilityStage);
    if (!byStage.has(stageId)) byStage.set(stageId, []);
    byStage.get(stageId)!.push(rec);
  }

  return rules.stages
    .map((stage) => {
      const recs = (byStage.get(stage.id) ?? []).sort(
        (a, b) => b.priorityScore - a.priorityScore || a.rank - b.rank,
      );
      return {
        stageId: stage.id,
        name: stage.name,
        description: stage.description,
        actions: recs.map((r) => ({
          code: r.code,
          namePl: r.namePl,
          domainPl: r.domainPl,
          priority: r.priority,
          expectedGainPercent: r.expectedGainPercent,
        })),
      } satisfies RoadmapStage;
    })
    .sort((a, b) => a.stageId - b.stageId);
}
