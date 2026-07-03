import { NextResponse } from "next/server";
import { requireAdministratorProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { normalizeSmsRulesSettings } from "@/lib/sms/sms-rules";
import {
  fetchSmsRulesSettingsServer,
  saveSmsRulesSettingsServer,
} from "@/lib/supabase/sms-rules-server";

export async function GET() {
  try {
    await requireAdministratorProfile();
    const settings = await fetchSmsRulesSettingsServer();
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdministratorProfile();

    const body = await request.json();
    const settings = normalizeSmsRulesSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings
        : body,
    );

    const saved = await saveSmsRulesSettingsServer(settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return jsonError(error);
  }
}
