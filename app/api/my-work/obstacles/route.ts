import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { ReportObstacleInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { reportObstacleServer } from "@/lib/supabase/my-work-plans-server";
import { createWorkItemObstacleNotificationServer } from "@/lib/notifications/work-item-notifications";
import { WORK_OBSTACLE_TYPE_LABELS } from "@/lib/my-work/plan-types";

export async function POST(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as ReportObstacleInput;
    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Opisz przeszkodę." }, { status: 400 });
    }
    if (!body.obstacleType) {
      return NextResponse.json({ error: "Wybierz typ przeszkody." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const obstacle = await reportObstacleServer(admin, userId, profile, body);

    if (obstacle.assignedToId && obstacle.workItemTitle) {
      await createWorkItemObstacleNotificationServer({
        workItemId: body.workItemId ?? obstacle.id,
        title: obstacle.workItemTitle,
        recipientProfileId: obstacle.assignedToId,
        obstacleType: WORK_OBSTACLE_TYPE_LABELS[body.obstacleType] ?? body.obstacleType,
        reporterName: obstacle.reporterName,
      });
    }

    return NextResponse.json({ obstacle: { id: obstacle.id } });
  } catch (error) {
    return jsonError(error);
  }
}
