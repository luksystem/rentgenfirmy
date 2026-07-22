import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import { markXpRedemptionPaidServer } from "@/lib/supabase/xp-admin-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ employeeId: string; redemptionId: string }> },
) {
  try {
    const { userId, profile } = await requireAdministratorProfile();
    const { employeeId, redemptionId } = await context.params;

    const admin = getSupabaseAdmin();
    await markXpRedemptionPaidServer(admin, redemptionId);

    await logActivityAdmin({
      actorUserId: userId,
      actorName: `${profile.firstName} ${profile.lastName}`.trim() || profile.email,
      action: "xp_redemption_paid",
      entityType: "user",
      entityId: employeeId,
      entityLabel: "Wymiana punktów XP",
      summary: "Oznaczono wymianę punktów jako wypłaconą.",
      href: `/admin/punkty-xp/${employeeId}`,
      metadata: { employeeId, redemptionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
