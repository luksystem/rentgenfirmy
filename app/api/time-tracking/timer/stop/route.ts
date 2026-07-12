import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { StopTimerInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { stopTimerServer } from "@/lib/supabase/time-tracking-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json().catch(() => ({}))) as StopTimerInput;
    const admin = getSupabaseAdmin();
    const entry = await stopTimerServer(admin, profile, body);
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}
