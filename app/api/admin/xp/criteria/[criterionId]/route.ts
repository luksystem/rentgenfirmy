import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { updateXpCriterionServer } from "@/lib/supabase/xp-admin-server";

export async function PUT(request: Request, context: { params: Promise<{ criterionId: string }> }) {
  try {
    await requireAdministratorProfile();
    const { criterionId } = await context.params;
    const body = await request.json();

    const points = Number(body?.points);
    if (!Number.isInteger(points)) {
      throw new HttpError(400, "Punkty muszą być liczbą całkowitą.");
    }
    const isActive = body?.isActive !== false;

    const admin = getSupabaseAdmin();
    await updateXpCriterionServer(admin, criterionId, { points, isActive });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
