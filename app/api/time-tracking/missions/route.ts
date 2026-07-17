import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchWorkMissionsForUserServer } from "@/lib/supabase/work-missions-server";

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const date = new URL(request.url).searchParams.get("date") ?? undefined;
    const admin = getSupabaseAdmin();
    const missions = await fetchWorkMissionsForUserServer(admin, profile, date);
    return NextResponse.json({ missions });
  } catch (error) {
    return jsonError(error);
  }
}
