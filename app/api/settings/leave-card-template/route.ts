import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeLeaveCardTemplateSettings } from "@/lib/leave/leave-settings";
import {
  fetchLeaveCardTemplateSettingsServer,
  saveLeaveCardTemplateSettingsServer,
} from "@/lib/supabase/leave-settings-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const settings = await fetchLeaveCardTemplateSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

/** Zapisuje metadane wzoru (plik jest wcześniej wgrywany przez klienta bezpośrednio do Storage). */
export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeLeaveCardTemplateSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveLeaveCardTemplateSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
