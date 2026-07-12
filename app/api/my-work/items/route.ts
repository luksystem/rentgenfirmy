import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import type { CreateWorkItemInput } from "@/lib/my-work/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createManualWorkItemServer,
  fetchWorkItemsForUser,
} from "@/lib/supabase/my-work-server";
import {
  createWorkItemAssignedNotificationServer,
  createWorkItemSentNotificationServer,
} from "@/lib/notifications/work-item-notifications";

export async function GET(request: Request) {
  try {
    const { userId, profile } = await requireAuthenticatedProfile();
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "team" ? "team" : "my";
    const assignedUserId = url.searchParams.get("assignedUserId");
    const sync = url.searchParams.get("sync") !== "false";

    const admin = getSupabaseAdmin();
    const items = await fetchWorkItemsForUser(admin, userId, profile, {
      scope,
      assignedUserId,
      syncKanban: sync,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    const body = (await request.json()) as CreateWorkItemInput;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Nazwa zadania jest wymagana." }, { status: 400 });
    }
    if (!body.assignedUserId) {
      return NextResponse.json({ error: "Wybierz osobę odpowiedzialną." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const item = await createManualWorkItemServer(admin, body, profile);

    if (body.sendImmediately) {
      await createWorkItemSentNotificationServer({
        workItemId: item.id,
        title: item.title,
        recipientProfileId: item.assignedUserId,
        managerName: profile.firstName ? `${profile.firstName} ${profile.lastName}`.trim() : "Manager",
      });
    } else {
      await createWorkItemAssignedNotificationServer({
        workItemId: item.id,
        title: item.title,
        recipientProfileId: item.assignedUserId,
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}
