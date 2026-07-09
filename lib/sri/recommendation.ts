// Recommendation Engine (runtime) — dla usług z luką (level < FLmax) wyciąga rekomendacje
// z wersjonowanego grafu rekomendacji i wzbogaca o aktualny poziom + capabilities.
import { getRecommendationGraph } from "@/lib/sri/artifacts";
import type { AssessmentInput, AuditRecommendation } from "@/lib/audit/types";
import { DEFAULT_METHODOLOGY_ID } from "@/lib/audit/types";

export function buildRecommendations(input: AssessmentInput): AuditRecommendation[] {
  const versionId = input.methodology_version_id || DEFAULT_METHODOLOGY_ID;
  const graph = getRecommendationGraph(versionId);
  const out: AuditRecommendation[] = [];

  for (const [code, level] of Object.entries(input.services)) {
    const rec = graph[code];
    if (!rec) continue;
    if (level >= rec.fl_max) continue; // brak luki

    const capabilities = (rec.technical_recommendation?.functions_to_implement ?? []).map(
      (f) => f.capability,
    );

    out.push({
      code,
      namePl: rec.name_pl,
      nameEn: rec.name_en,
      domain: rec.domain,
      domainPl: rec.domain_pl,
      currentLevel: level,
      targetLevel: rec.technical_recommendation?.target_level ?? rec.fl_max,
      priority: rec.priority?.level ?? "Medium",
      priorityScore: rec.priority?.score ?? 0,
      rank: rec.ranking?.rank ?? 9999,
      expectedGainPercent: rec.expected_improvement?.total_expected_gain_percent ?? 0,
      gapDescription: rec.gap_description ?? "",
      capabilities,
    });
  }

  // najpierw najwyższy priorytet, potem najlepszy ranking
  out.sort((a, b) => b.priorityScore - a.priorityScore || a.rank - b.rank);
  return out;
}
