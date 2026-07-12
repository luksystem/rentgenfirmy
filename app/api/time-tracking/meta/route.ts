import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTimeTrackingMetaServer } from "@/lib/supabase/time-tracking-server";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const meta = await fetchTimeTrackingMetaServer(admin);
    return NextResponse.json({ meta });
  } catch (error) {
    return jsonError(error);
  }
}
