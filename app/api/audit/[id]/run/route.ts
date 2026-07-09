import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import {
  getAnswers,
  upsertResult,
  setStatus,
} from "@/lib/supabase/audit-repository";
import { compute, validateAssessment, SRI_ENGINE_VERSION } from "@/lib/sri/engine";
import { buildRecommendations } from "@/lib/sri/recommendation";
import { buildRoadmap } from "@/lib/sri/optimization";
import type { AssessmentInput } from "@/lib/audit/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);

    if (!session.methodologyVersionId || !session.buildingType || !session.climateZone) {
      throw new HttpError(409, "Najpierw wybierz metodologię i kontekst budynku.");
    }
    const answers = await getAnswers(id);
    if (Object.keys(answers).length === 0) {
      throw new HttpError(409, "Brak odpowiedzi — uzupełnij co najmniej jedną usługę.");
    }

    const input: AssessmentInput = {
      methodology_version_id: session.methodologyVersionId,
      building_type: session.buildingType,
      climate_zone: session.climateZone,
      services: answers,
    };

    const validationErrors = validateAssessment(input);
    if (validationErrors.length > 0) {
      throw new HttpError(400, `Błąd walidacji: ${validationErrors.slice(0, 5).join("; ")}`);
    }

    // 6. Calculation Engine
    const calculation = compute(input);
    // 7. Recommendation Engine
    const recommendations = buildRecommendations(input);
    // 8. Optimization Engine + 9. Roadmap
    const roadmap = buildRoadmap(recommendations, session.methodologyVersionId);

    await upsertResult(id, "calculation", calculation, SRI_ENGINE_VERSION);
    await upsertResult(id, "recommendation", { items: recommendations }, SRI_ENGINE_VERSION);
    await upsertResult(id, "roadmap", { stages: roadmap }, SRI_ENGINE_VERSION);
    await setStatus(id, "completed");

    return NextResponse.json({
      calculation: {
        totalScorePercent: calculation.total_score_percent,
        class: calculation.class,
        perDomain: calculation.per_domain,
        perCriterion: calculation.per_criterion,
      },
      recommendationCount: recommendations.length,
      roadmapStages: roadmap.length,
      status: "completed",
    });
  } catch (error) {
    return jsonError(error);
  }
}
