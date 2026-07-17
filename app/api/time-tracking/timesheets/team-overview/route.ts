import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { TimesheetPeriodType } from "@/lib/time-tracking/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTeamTimesheetOverviewServer } from "@/lib/supabase/time-sheets-server";

function parsePeriodType(value: string | null): TimesheetPeriodType {
  return value === "month" ? "month" : "week";
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const url = new URL(request.url);

    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Podaj zakres dat zestawienia." }, { status: 400 });
    }

    const rows = await fetchTeamTimesheetOverviewServer(admin, profile, {
      dateFrom,
      dateTo,
      periodType: parsePeriodType(url.searchParams.get("periodType")),
    });

    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
