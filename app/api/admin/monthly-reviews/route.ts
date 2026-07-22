import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchMonthlyReviewListForAdminServer } from "@/lib/supabase/monthly-review-admin-server";
import { resolveCurrentPeriodMonth } from "@/lib/supabase/monthly-review-server";

export async function GET(request: Request) {
  try {
    await requireAdministratorProfile();
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || resolveCurrentPeriodMonth();

    const admin = getSupabaseAdmin();
    const items = await fetchMonthlyReviewListForAdminServer(admin, month);
    return NextResponse.json({ items, periodMonth: month });
  } catch (error) {
    return jsonError(error);
  }
}
