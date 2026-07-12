import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendWorkItemServer } from "@/lib/supabase/my-work-server";
import { createWorkItemSentNotificationServer } from "@/lib/notifications/work-item-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const admin = getSupabaseAdmin();
    const detail = await sendWorkItemServer(admin, id, profile);
    if (!detail) {
      return NextResponse.json({ error: "Nie znaleziono zadania." }, { status: 404 });
    }

    await createWorkItemSentNotificationServer({
      workItemId: detail.item.id,
      title: detail.item.title,
      recipientProfileId: detail.item.assignedUserId,
      managerName: profile.firstName ? `${profile.firstName} ${profile.lastName}`.trim() : "Manager",
    });

    return NextResponse.json({ detail });
  } catch (error) {
    return jsonError(error);
  }
}
