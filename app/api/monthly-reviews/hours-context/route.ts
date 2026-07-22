import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchTimesheetSummaryServer } from "@/lib/supabase/time-sheets-server";
import { resolveTimesheetPeriod } from "@/lib/time-tracking/timesheet-period";
import {
  buildHoursContextSnapshot,
  hoursContextSnapshotToText,
  resolveCurrentPeriodMonth,
} from "@/lib/supabase/monthly-review-server";
import { formatPeriodMonthLabel } from "@/lib/monthly-reviews/format";

export async function GET(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    if (employeeId && employeeId !== profile.id && !hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Brak uprawnień do podglądu godzin innej osoby.");
    }

    const admin = getSupabaseAdmin();
    const period = resolveTimesheetPeriod("month", new Date());

    const summary = await fetchTimesheetSummaryServer(admin, profile, {
      userId: employeeId ?? profile.id,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      periodType: "month",
    });

    const snapshot = buildHoursContextSnapshot(summary);

    return NextResponse.json({
      snapshot,
      text: hoursContextSnapshotToText(snapshot),
      periodMonthLabel: formatPeriodMonthLabel(resolveCurrentPeriodMonth()),
    });
  } catch (error) {
    return jsonError(error);
  }
}
