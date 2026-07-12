import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pauseTimerServer } from "@/lib/supabase/time-tracking-server";

export async function POST() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const timer = await pauseTimerServer(admin, profile);
    return NextResponse.json({ timer });
  } catch (error) {
    return jsonError(error);
  }
}
