import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { getResults } from "@/lib/supabase/audit-repository";
import { buildReport } from "@/lib/sri/report";
import type {
  CalculationResult,
  AuditRecommendation,
  RoadmapStage,
} from "@/lib/audit/types";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);

    if (session.status !== "completed") {
      throw new HttpError(409, "Raport dostępny dopiero po uruchomieniu obliczeń.");
    }

    const results = await getResults(id);
    const calculation = results.calculation as CalculationResult | undefined;
    if (!calculation) throw new HttpError(409, "Brak wyników obliczeń.");

    const recommendations =
      (results.recommendation as { items: AuditRecommendation[] } | undefined)?.items ?? [];
    const roadmap = (results.roadmap as { stages: RoadmapStage[] } | undefined)?.stages ?? [];

    const report = buildReport(session, calculation, recommendations, roadmap);
    return NextResponse.json(report);
  } catch (error) {
    return jsonError(error);
  }
}
