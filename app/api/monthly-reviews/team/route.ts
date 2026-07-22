import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamReviewQueueServer, resolveCurrentPeriodMonth } from "@/lib/supabase/monthly-review-server";

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Brak uprawnień do oceniania pracowników.");
    }

    const admin = getSupabaseAdmin();
    const items = await fetchTeamReviewQueueServer(admin, resolveCurrentPeriodMonth());
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}
