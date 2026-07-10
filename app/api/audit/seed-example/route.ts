import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http-error";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import {
  createSession,
  updateMethodology,
  updateSessionMeta,
  upsertAnswers,
  upsertResult,
  setStatus,
} from "@/lib/supabase/audit-repository";
import { buildReferenceAssessment } from "@/lib/sri/reference";
import { compute, SRI_ENGINE_VERSION } from "@/lib/sri/engine";
import { buildRecommendations } from "@/lib/sri/recommendation";
import { buildRoadmap } from "@/lib/sri/optimization";
import type { BuildingType, ClimateZone } from "@/lib/audit/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tworzy realny, gotowy audyt z danych referencyjnych — można go potem publicznie udostępnić.
export async function POST() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const input = buildReferenceAssessment();

    const session = await createSession(userId, "Budynek referencyjny (przykład)");

    await updateMethodology(session.id, {
      methodologyVersionId: input.methodology_version_id,
      buildingType: input.building_type as BuildingType,
      climateZone: input.climate_zone as ClimateZone,
    });

    await updateSessionMeta(session.id, {
      buildingAddress: "ul. Przykładowa 1, 00-001 Miasto",
      auditorName: "Zespół Luksystem",
      auditedAt: new Date().toISOString().slice(0, 10),
    });

    await upsertAnswers(
      session.id,
      Object.entries(input.services).map(([questionCode, valueInt]) => ({
        questionCode,
        valueInt,
        verificationStatus: "confirmed" as const,
      })),
    );

    const calculation = compute(input);
    const recommendations = buildRecommendations(input);
    const roadmap = buildRoadmap(recommendations, input.methodology_version_id);

    await upsertResult(session.id, "calculation", calculation, SRI_ENGINE_VERSION);
    await upsertResult(session.id, "recommendation", { items: recommendations }, SRI_ENGINE_VERSION);
    await upsertResult(session.id, "roadmap", { stages: roadmap }, SRI_ENGINE_VERSION);
    await setStatus(session.id, "completed");

    return NextResponse.json({ id: session.id });
  } catch (error) {
    return jsonError(error);
  }
}
