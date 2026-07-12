import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  cancelTimerServer,
  fetchActiveTimerServer,
} from "@/lib/supabase/time-tracking-server";

export async function GET() {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const timer = await fetchActiveTimerServer(admin, userId);
    return NextResponse.json({ timer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    await cancelTimerServer(admin, profile);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
