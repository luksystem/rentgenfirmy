import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ensureTimesheetServer,
  fetchTimesheetSummaryServer,
  submitTimesheetServer,
} from "@/lib/supabase/time-sheets-server";
import { isEditableTimesheetStatus } from "@/lib/time-tracking/types";
import { resolveTimesheetPeriod } from "@/lib/time-tracking/timesheet-period";
import {
  buildHoursContextSnapshot,
  fetchCombinedReviewServer,
  resolveCurrentPeriodMonth,
  submitSelfAssessmentServer,
} from "@/lib/supabase/monthly-review-server";
import { createMonthlyReviewSelfSubmittedNotificationServer } from "@/lib/notifications/server";

export async function GET() {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const periodMonth = resolveCurrentPeriodMonth();

    const view = await fetchCombinedReviewServer(admin, profile, periodMonth);
    return NextResponse.json({ view });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!profile.monthlyReviewEnabled) {
      throw new HttpError(403, "Nie uczestniczysz w cyklu ocen miesięcznych.");
    }

    const body = await request.json();
    const rating = Number(body?.rating);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      throw new HttpError(400, "Ocena musi być liczbą całkowitą od 1 do 10.");
    }
    if (!comment) {
      throw new HttpError(400, "Opisz krótko swój miesiąc.");
    }

    const admin = getSupabaseAdmin();
    const periodMonth = resolveCurrentPeriodMonth();
    const period = resolveTimesheetPeriod("month", new Date());

    // Samoocena = pracownik potwierdza, że przejrzał swój miesiąc — wysyłamy więc
    // przy okazji jego godziny do akceptacji (jeśli jeszcze nie zostały wysłane).
    const sheet = await ensureTimesheetServer(admin, profile, {
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      periodType: "month",
    });
    if (isEditableTimesheetStatus(sheet.status)) {
      try {
        await submitTimesheetServer(admin, profile, sheet.id);
      } catch (submitError) {
        throw new HttpError(
          400,
          submitError instanceof Error
            ? `Zanim wyślesz samoocenę, popraw swoje godziny: ${submitError.message}`
            : "Nie udało się wysłać godzin do akceptacji.",
        );
      }
    }

    const summary = await fetchTimesheetSummaryServer(admin, profile, {
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      periodType: "month",
    });
    const hoursContextSnapshot = buildHoursContextSnapshot(summary);

    await submitSelfAssessmentServer(admin, {
      employeeId: profile.id,
      periodMonth,
      rating,
      comment,
      hoursContextSnapshot,
    });

    await createMonthlyReviewSelfSubmittedNotificationServer({
      employeeId: profile.id,
      employeeName: `${profile.firstName} ${profile.lastName}`.trim() || profile.email,
      periodMonth,
    }).catch(() => undefined);

    const view = await fetchCombinedReviewServer(admin, profile, periodMonth);
    return NextResponse.json({ view });
  } catch (error) {
    return jsonError(error);
  }
}
