import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchPlanTimeSuggestionsServer } from "@/lib/supabase/time-tracking-plan-server";

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Podaj zakres dat (dateFrom, dateTo)." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const suggestions = await fetchPlanTimeSuggestionsServer(admin, profile, dateFrom, dateTo);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return jsonError(error);
  }
}
