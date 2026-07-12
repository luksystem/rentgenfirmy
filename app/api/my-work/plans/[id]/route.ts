import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { UpdateWeekPlanInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { updateWeekPlanServer } from "@/lib/supabase/my-work-plans-server";
import { createWorkItemSentNotificationServer } from "@/lib/notifications/work-item-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as UpdateWeekPlanInput;

    const admin = getSupabaseAdmin();
    const plan = await updateWeekPlanServer(admin, id, profile, body);

    if (body.sendImmediately) {
      const managerName =
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Manager";
      await createWorkItemSentNotificationServer({
        workItemId: plan.items[0]?.workItemId ?? plan.id,
        title: `Plan tygodnia ${plan.dateFrom} – ${plan.dateTo}`,
        recipientProfileId: plan.assignedUserId,
        managerName,
      });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError(error);
  }
}
