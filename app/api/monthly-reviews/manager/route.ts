import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { hasFullAppAccess } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { resolveCurrentPeriodMonth, submitManagerAssessmentServer } from "@/lib/supabase/monthly-review-server";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!hasFullAppAccess(profile.role)) {
      throw new HttpError(403, "Brak uprawnień do oceniania pracowników.");
    }

    const body = await request.json();
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const rating = Number(body?.rating);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!employeeId) {
      throw new HttpError(400, "Brak identyfikatora pracownika.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      throw new HttpError(400, "Ocena musi być liczbą całkowitą od 1 do 10.");
    }
    if (!comment) {
      throw new HttpError(400, "Dodaj krótki komentarz do oceny.");
    }

    const admin = getSupabaseAdmin();

    const { data: employeeRow, error: employeeError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", employeeId)
      .maybeSingle();
    if (employeeError) {
      throw new Error(employeeError.message);
    }
    if (!employeeRow) {
      throw new HttpError(404, "Nie znaleziono pracownika.");
    }
    const employee = mapProfileRow(employeeRow);
    if (!employee.monthlyReviewEnabled) {
      throw new HttpError(400, "Ten pracownik nie uczestniczy w cyklu ocen miesięcznych.");
    }

    await submitManagerAssessmentServer(admin, {
      employeeId,
      periodMonth: resolveCurrentPeriodMonth(),
      managerId: profile.id,
      rating,
      comment,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
