import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTimeEntryLogsServer } from "@/lib/supabase/time-tracking-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const logs = await fetchTimeEntryLogsServer(admin, profile, id);
    return NextResponse.json({ logs });
  } catch (error) {
    return jsonError(error);
  }
}
