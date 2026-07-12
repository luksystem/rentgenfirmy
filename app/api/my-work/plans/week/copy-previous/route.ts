import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { copyWeekPlanFromPreviousServer } from "@/lib/supabase/my-work-plans-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as { assignedUserId?: string; referenceDate?: string | null };
    if (!body.assignedUserId) {
      return NextResponse.json({ error: "Wybierz pracownika." }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const plan = await copyWeekPlanFromPreviousServer(
      admin,
      profile,
      body.assignedUserId,
      body.referenceDate ?? undefined,
    );
    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError(error);
  }
}
