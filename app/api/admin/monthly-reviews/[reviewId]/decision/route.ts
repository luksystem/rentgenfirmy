import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import { saveMonthlyReviewDecisionServer } from "@/lib/supabase/monthly-review-admin-server";
import { MONTHLY_REVIEW_DECISION_STATUSES } from "@/lib/monthly-reviews/types";

export async function POST(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  try {
    const { userId, profile } = await requireAdministratorProfile();
    const { reviewId } = await context.params;
    const body = await request.json();

    const status = typeof body?.status === "string" ? body.status : "";
    if (!(MONTHLY_REVIEW_DECISION_STATUSES as readonly string[]).includes(status)) {
      throw new HttpError(400, "Nieprawidłowy status decyzji.");
    }

    const amount =
      body?.amount === null || body?.amount === undefined || body?.amount === ""
        ? null
        : Number(body.amount);
    if (amount !== null && !Number.isFinite(amount)) {
      throw new HttpError(400, "Nieprawidłowa kwota.");
    }

    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const admin = getSupabaseAdmin();
    const decision = await saveMonthlyReviewDecisionServer(
      admin,
      reviewId,
      { status: status as (typeof MONTHLY_REVIEW_DECISION_STATUSES)[number], amount, note },
      userId,
    );

    await logActivityAdmin({
      actorUserId: userId,
      actorName: `${profile.firstName} ${profile.lastName}`.trim() || profile.email,
      action: "monthly_review_decision_saved",
      entityType: "user",
      entityId: reviewId,
      entityLabel: "Ocena miesięczna",
      summary: `Zapisano decyzję kompensacyjną (${status}).`,
      href: `/admin/oceny-miesieczne/${reviewId}`,
      metadata: { reviewId, status, amount },
    });

    return NextResponse.json({ decision });
  } catch (error) {
    return jsonError(error);
  }
}
