import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchMyWorkDashboardServer } from "@/lib/supabase/my-work-dashboard-server";

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const metrics = await fetchMyWorkDashboardServer(admin, profile);
    return NextResponse.json({ metrics });
  } catch (error) {
    return jsonError(error);
  }
}
