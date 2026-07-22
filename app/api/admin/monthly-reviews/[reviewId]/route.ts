import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchMonthlyReviewDetailForAdminServer } from "@/lib/supabase/monthly-review-admin-server";

export async function GET(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  try {
    await requireAdministratorProfile();
    const { reviewId } = await context.params;

    const admin = getSupabaseAdmin();
    const detail = await fetchMonthlyReviewDetailForAdminServer(admin, reviewId);
    if (!detail) {
      throw new HttpError(404, "Nie znaleziono oceny.");
    }

    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
