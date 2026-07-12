import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { WorkItemCompleteInput } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { completeWorkItemServer } from "@/lib/supabase/my-work-server";
import { createWorkItemVerificationNeededNotificationServer } from "@/lib/notifications/work-item-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json()) as WorkItemCompleteInput;

    if (!body.outcome) {
      return NextResponse.json({ error: "Wybierz wynik zakończenia." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const detail = await completeWorkItemServer(admin, id, body, profile);
    if (!detail) {
      return NextResponse.json({ error: "Nie znaleziono zadania." }, { status: 404 });
    }

    if (detail.item.status === "pending_verification" && detail.item.managerId) {
      await createWorkItemVerificationNeededNotificationServer({
        workItemId: detail.item.id,
        title: detail.item.title,
        recipientProfileId: detail.item.managerId,
        employeeName: profile.firstName
          ? `${profile.firstName} ${profile.lastName}`.trim()
          : "Pracownik",
      });
    }

    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
