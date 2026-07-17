import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { AcceptPlanSuggestionsInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { acceptPlanTimeSuggestionsServer } from "@/lib/supabase/time-tracking-plan-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as AcceptPlanSuggestionsInput;

    if (!Array.isArray(body.suggestions) || body.suggestions.length === 0) {
      return NextResponse.json({ error: "Wybierz co najmniej jedną propozycję." }, { status: 400 });
    }

    for (const item of body.suggestions) {
      if (!item.resourcePlanItemId || !item.date) {
        return NextResponse.json({ error: "Nieprawidłowa propozycja z planu." }, { status: 400 });
      }
    }

    const admin = getSupabaseAdmin();
    const entries = await acceptPlanTimeSuggestionsServer(admin, profile, body);
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}
