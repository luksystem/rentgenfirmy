import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { AcknowledgeWeekPlanInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { acknowledgeWeekPlanServer } from "@/lib/supabase/my-work-plans-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as AcknowledgeWeekPlanInput;
    const admin = getSupabaseAdmin();
    const plan = await acknowledgeWeekPlanServer(admin, id, userId, body);
    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError(error);
  }
}
