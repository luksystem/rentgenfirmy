import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmployeeXpSummaryServer } from "@/lib/supabase/xp-server";

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const summary = await fetchEmployeeXpSummaryServer(admin, profile.id);
    return NextResponse.json({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
