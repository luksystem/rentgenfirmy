import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { SubmitTimesheetInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { submitTimesheetServer } from "@/lib/supabase/time-sheets-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as SubmitTimesheetInput;
    const admin = getSupabaseAdmin();
    const timesheet = await submitTimesheetServer(admin, profile, id, body);
    return NextResponse.json({ timesheet });
  } catch (error) {
    return jsonError(error);
  }
}
