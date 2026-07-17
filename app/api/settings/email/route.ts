import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeEmailSettings } from "@/lib/email/email-settings";
import {
  fetchEmailSettingsServer,
  saveEmailSettingsServer,
} from "@/lib/supabase/email-settings-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const settings = await fetchEmailSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeEmailSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveEmailSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
