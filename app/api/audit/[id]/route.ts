import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { getAnswers, getResults } from "@/lib/supabase/audit-repository";
import { buildQuestions } from "@/lib/sri/questions";
import {
  METHODOLOGIES,
  BUILDING_TYPES,
  CLIMATE_ZONES,
  DEFAULT_METHODOLOGY_ID,
} from "@/lib/audit/types";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { session } = await requireOwnedSession(id);

    const questions =
      session.status === "draft"
        ? []
        : buildQuestions(session.methodologyVersionId ?? DEFAULT_METHODOLOGY_ID);
    const answers = await getAnswers(id);
    const results = await getResults(id);

    return NextResponse.json({
      session,
      methodologies: METHODOLOGIES,
      buildingTypes: BUILDING_TYPES,
      climateZones: CLIMATE_ZONES,
      questions,
      answers,
      hasResults: Boolean(results.calculation),
    });
  } catch (error) {
    return jsonError(error);
  }
}
