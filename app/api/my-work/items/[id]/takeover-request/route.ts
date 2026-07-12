import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { createWorkItemTakeoverRequestedNotificationServer } from "@/lib/notifications/work-item-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestWorkItemTakeoverServer } from "@/lib/supabase/my-work-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { comment?: string };
    const admin = getSupabaseAdmin();
    const result = await requestWorkItemTakeoverServer(admin, id, profile, body.comment);

    if (result.recipientId && result.recipientId !== profile.id) {
      await createWorkItemTakeoverRequestedNotificationServer({
        workItemId: id,
        title: result.detail.item.title,
        recipientProfileId: result.recipientId,
        requesterName: result.requesterName,
      });
    }

    return NextResponse.json({ detail: result.detail });
  } catch (error) {
    return jsonError(error);
  }
}
