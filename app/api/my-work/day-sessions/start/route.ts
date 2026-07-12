import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { StartDayInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { startDaySessionServer } from "@/lib/supabase/my-work-plans-server";

export async function POST(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const body = (await request.json().catch(() => ({}))) as StartDayInput;
    const admin = getSupabaseAdmin();
    const context = await startDaySessionServer(admin, userId, profile, body);
    return NextResponse.json({ context });
  } catch (error) {
    return jsonError(error);
  }
}
