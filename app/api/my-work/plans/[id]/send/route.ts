import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWeekPlanServer } from "@/lib/supabase/my-work-plans-server";
import { createWorkItemSentNotificationServer } from "@/lib/notifications/work-item-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const plan = await sendWeekPlanServer(admin, id, profile);
    if (!plan) {
      return NextResponse.json({ error: "Plan nie istnieje." }, { status: 404 });
    }

    const managerName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Manager";
    await createWorkItemSentNotificationServer({
      workItemId: plan.items[0]?.workItemId ?? plan.id,
      title: `Plan tygodnia ${plan.dateFrom} – ${plan.dateTo}`,
      recipientProfileId: plan.assignedUserId,
      managerName,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError(error);
  }
}
