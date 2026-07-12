import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { StartTimerInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { startTimerServer } from "@/lib/supabase/time-tracking-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as StartTimerInput;

    if (!body.categoryId || !body.entryTypeId) {
      return NextResponse.json({ error: "Wybierz kategorię i typ wpisu." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const timer = await startTimerServer(admin, profile, body);
    return NextResponse.json({ timer });
  } catch (error) {
    return jsonError(error);
  }
}
