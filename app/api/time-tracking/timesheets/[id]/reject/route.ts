import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { RejectTimesheetInput } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rejectTimesheetServer } from "@/lib/supabase/time-sheets-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as RejectTimesheetInput;

    if (!body.managerComment?.trim()) {
      return NextResponse.json({ error: "Komentarz jest wymagany przy odrzuceniu." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const timesheet = await rejectTimesheetServer(admin, profile, id, body);
    return NextResponse.json({ timesheet });
  } catch (error) {
    return jsonError(error);
  }
}
