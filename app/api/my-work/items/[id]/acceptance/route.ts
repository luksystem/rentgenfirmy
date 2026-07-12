import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { WorkItemAcceptanceInput } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recordWorkItemAcceptanceServer } from "@/lib/supabase/my-work-server";
import { createWorkItemObstacleNotificationServer } from "@/lib/notifications/work-item-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as WorkItemAcceptanceInput;

    if (!body.action) {
      return NextResponse.json({ error: "Brak akcji przyjęcia." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const detail = await recordWorkItemAcceptanceServer(admin, id, body, profile);
    if (!detail) {
      return NextResponse.json({ error: "Nie znaleziono zadania." }, { status: 404 });
    }

    if (
      body.action === "report_risk" ||
      body.action === "report_shortage" ||
      body.action === "needs_clarification"
    ) {
      const managerId = detail.item.managerId;
      if (managerId) {
        await createWorkItemObstacleNotificationServer({
          workItemId: detail.item.id,
          title: detail.item.title,
          recipientProfileId: managerId,
          obstacleType: body.action,
          reporterName: profile.firstName
            ? `${profile.firstName} ${profile.lastName}`.trim()
            : "Pracownik",
        });
      }
    }

    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
