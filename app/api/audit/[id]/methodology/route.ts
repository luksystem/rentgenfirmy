import { NextResponse } from "next/server";
import { jsonError, HttpError } from "@/lib/auth/http-error";
import { requireOwnedSession } from "@/lib/audit/api-helpers";
import { updateMethodology } from "@/lib/supabase/audit-repository";
import {
  METHODOLOGIES,
  BUILDING_TYPES,
  CLIMATE_ZONES,
  type BuildingType,
  type ClimateZone,
} from "@/lib/audit/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOwnedSession(id);

    const body = (await request.json().catch(() => ({}))) as {
      methodologyVersionId?: string;
      buildingType?: string;
      climateZone?: string;
    };

    if (!METHODOLOGIES.some((m) => m.id === body.methodologyVersionId)) {
      throw new HttpError(400, "Nieznana metodologia.");
    }
    if (!BUILDING_TYPES.includes(body.buildingType as BuildingType)) {
      throw new HttpError(400, "Nieprawidłowy typ budynku.");
    }
    if (!CLIMATE_ZONES.includes(body.climateZone as ClimateZone)) {
      throw new HttpError(400, "Nieprawidłowa strefa klimatyczna.");
    }

    const session = await updateMethodology(id, {
      methodologyVersionId: body.methodologyVersionId!,
      buildingType: body.buildingType as BuildingType,
      climateZone: body.climateZone as ClimateZone,
    });
    return NextResponse.json({ session });
  } catch (error) {
    return jsonError(error);
  }
}
