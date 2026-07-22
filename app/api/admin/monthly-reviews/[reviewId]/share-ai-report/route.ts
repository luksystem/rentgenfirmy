import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import { shareAiReportWithEmployeeServer } from "@/lib/supabase/monthly-review-admin-server";

export async function POST(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  try {
    const { userId, profile } = await requireAdministratorProfile();
    const { reviewId } = await context.params;

    const admin = getSupabaseAdmin();
    await shareAiReportWithEmployeeServer(admin, reviewId);

    await logActivityAdmin({
      actorUserId: userId,
      actorName: `${profile.firstName} ${profile.lastName}`.trim() || profile.email,
      action: "monthly_review_ai_report_shared",
      entityType: "user",
      entityId: reviewId,
      entityLabel: "Ocena miesięczna",
      summary: "Udostępniono raport AI pracownikowi.",
      href: `/admin/oceny-miesieczne/${reviewId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
