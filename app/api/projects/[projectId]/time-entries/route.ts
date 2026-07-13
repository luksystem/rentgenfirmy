import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchProjectTimeTrackingServer } from "@/lib/supabase/time-tracking-server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { projectId } = await context.params;
    const admin = getSupabaseAdmin();
    const payload = await fetchProjectTimeTrackingServer(admin, profile, projectId);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
