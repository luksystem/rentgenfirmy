import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { HttpError } from "@/lib/auth/http-error";
import { isStaffRole } from "@/lib/permissions/can-module-action";
import { generateSmartHomeKbRestructure } from "@/lib/ai/smart-home-kb-restructure-generator";
import { normalizeSmartHomeKbAiSettings } from "@/lib/smart-home-kb/ai-settings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SMART_HOME_KB_AI_SETTINGS_ID = "smart_home_kb_ai_settings";

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuthenticatedProfile();
    if (!isStaffRole(profile.role)) {
      throw new HttpError(403, "Brak uprawnień.");
    }

    const body = (await request.json()) as { draftText?: string };
    const draftText = body.draftText?.trim() ?? "";
    if (!draftText) {
      return NextResponse.json({ error: "Wklej lub napisz treść do uporządkowania." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("data")
      .eq("id", SMART_HOME_KB_AI_SETTINGS_ID)
      .maybeSingle();
    const settings = normalizeSmartHomeKbAiSettings(
      settingsRow?.data as Record<string, unknown> | undefined,
    );

    const result = await generateSmartHomeKbRestructure({
      draftText,
      instructions: settings.restructurePromptInstructions,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return jsonError(error);
  }
}
