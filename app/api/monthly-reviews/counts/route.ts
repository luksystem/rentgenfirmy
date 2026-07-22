import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamReviewQueueServer, resolveCurrentPeriodMonth } from "@/lib/supabase/monthly-review-server";

/** Liczba pracowników, którzy złożyli samoocenę i czekają na ocenę managera — do dzwoneczka/badge. */
export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      return NextResponse.json({ pendingForMeCount: 0 });
    }

    const admin = getSupabaseAdmin();
    const items = await fetchTeamReviewQueueServer(admin, resolveCurrentPeriodMonth());
    const pendingForMeCount = items.filter(
      (item) => item.selfSubmittedAt && !item.managerSubmittedAt,
    ).length;

    return NextResponse.json({ pendingForMeCount });
  } catch (error) {
    return jsonError(error);
  }
}
