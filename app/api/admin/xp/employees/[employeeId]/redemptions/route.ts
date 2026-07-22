import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logActivityAdmin } from "@/lib/supabase/activity-log-server";
import {
  createXpRedemptionServer,
  fetchXpSettingsServer,
} from "@/lib/supabase/xp-admin-server";
import { fetchEmployeeXpSummaryServer } from "@/lib/supabase/xp-server";

export async function POST(request: Request, context: { params: Promise<{ employeeId: string }> }) {
  try {
    const { userId, profile } = await requireAdministratorProfile();
    const { employeeId } = await context.params;
    const body = await request.json();

    const pointsRedeemed = Number(body?.pointsRedeemed);
    if (!Number.isInteger(pointsRedeemed) || pointsRedeemed <= 0) {
      throw new HttpError(400, "Liczba punktów do wymiany musi być dodatnią liczbą całkowitą.");
    }

    const admin = getSupabaseAdmin();
    const [settings, summary] = await Promise.all([
      fetchXpSettingsServer(),
      fetchEmployeeXpSummaryServer(admin, employeeId),
    ]);

    if (pointsRedeemed > summary.totalPoints) {
      throw new HttpError(400, "Pracownik nie ma tylu punktów na koncie.");
    }

    const amount =
      typeof body?.amount === "number" && Number.isFinite(body.amount)
        ? body.amount
        : Math.round(pointsRedeemed * settings.pointWeightPln * 100) / 100;
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const redemption = await createXpRedemptionServer(
      admin,
      { employeeId, pointsRedeemed, pointWeightAtTime: settings.pointWeightPln, amount, note },
      userId,
    );

    await logActivityAdmin({
      actorUserId: userId,
      actorName: `${profile.firstName} ${profile.lastName}`.trim() || profile.email,
      action: "xp_redemption_created",
      entityType: "user",
      entityId: employeeId,
      entityLabel: "Wymiana punktów XP",
      summary: `Utworzono wymianę ${pointsRedeemed} pkt → ${amount.toFixed(2)} zł.`,
      href: `/admin/punkty-xp/${employeeId}`,
      metadata: { employeeId, pointsRedeemed, amount },
    });

    return NextResponse.json({ redemption });
  } catch (error) {
    return jsonError(error);
  }
}
