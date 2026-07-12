import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { EndDayInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { endDaySessionServer } from "@/lib/supabase/my-work-plans-server";

export async function POST(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as EndDayInput;
    if (!body.employeeComment?.trim()) {
      return NextResponse.json({ error: "Podsumowanie dnia wymaga komentarza." }, { status: 400 });
    }
    const admin = getSupabaseAdmin();
    const context = await endDaySessionServer(admin, userId, profile, body);
    return NextResponse.json({ context });
  } catch (error) {
    return jsonError(error);
  }
}
