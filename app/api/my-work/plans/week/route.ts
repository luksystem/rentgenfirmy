import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { CreateWeekPlanInput } from "@/lib/my-work/plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createWeekPlanServer,
  fetchCurrentWeekPlanServer,
} from "@/lib/supabase/my-work-plans-server";
import { createWorkItemSentNotificationServer } from "@/lib/notifications/work-item-notifications";

export async function GET(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const assignedUserId = url.searchParams.get("assignedUserId");
    const referenceDate = url.searchParams.get("referenceDate");

    const admin = getSupabaseAdmin();
    const plan = await fetchCurrentWeekPlanServer(admin, userId, profile, {
      assignedUserId,
      referenceDate,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as CreateWeekPlanInput;
    if (!body.assignedUserId) {
      return NextResponse.json({ error: "Wybierz pracownika." }, { status: 400 });
    }
    if (!body.dateFrom || !body.dateTo) {
      return NextResponse.json({ error: "Podaj zakres dat planu tygodnia." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const plan = await createWeekPlanServer(admin, profile, body);

    if (body.sendImmediately) {
      const managerName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "Manager";
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
