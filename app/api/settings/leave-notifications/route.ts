import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeLeaveNotificationsSettings } from "@/lib/leave/leave-settings";
import {
  fetchLeaveNotificationsSettingsServer,
  saveLeaveNotificationsSettingsServer,
} from "@/lib/supabase/leave-settings-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const settings = await fetchLeaveNotificationsSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeLeaveNotificationsSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveLeaveNotificationsSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
