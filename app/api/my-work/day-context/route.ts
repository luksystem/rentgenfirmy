import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchDayContextServer } from "@/lib/supabase/my-work-plans-server";

export async function GET(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const sessionDate = url.searchParams.get("date") ?? undefined;
    const admin = getSupabaseAdmin();
    const context = await fetchDayContextServer(admin, userId, profile, sessionDate);
    return NextResponse.json({ context });
  } catch (error) {
    return jsonError(error);
  }
}
