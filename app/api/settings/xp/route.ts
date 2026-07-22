import { NextResponse } from "next/server";
import {
  requireAdministratorProfile,
  requireAuthenticatedProfile,
} from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeXpSettings } from "@/lib/xp/settings";
import { fetchXpSettingsServer, saveXpSettingsServer } from "@/lib/supabase/xp-admin-server";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const settings = await fetchXpSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeXpSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );
    const saved = await saveXpSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
