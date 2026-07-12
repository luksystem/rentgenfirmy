import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { approveTimesheetServer } from "@/lib/supabase/time-sheets-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const timesheet = await approveTimesheetServer(admin, profile, id);
    return NextResponse.json({ timesheet });
  } catch (error) {
    return jsonError(error);
  }
}
