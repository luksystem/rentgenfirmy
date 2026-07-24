import { NextResponse } from "next/server";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";
import { HttpError, jsonError } from "@/lib/auth/http-error";
import { isStaffRole } from "@/lib/permissions/can-module-action";
import { generateCompanyStandardRestructure } from "@/lib/ai/company-standard-restructure-generator";
import { normalizeCompanyStandardAiSettings } from "@/lib/standards/ai-settings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const COMPANY_STANDARD_AI_SETTINGS_ID = "company_standards_ai_settings";

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

    const admin = getSupabaseAdmin();
    const { data: settingsRow } = await admin
      .from("app_settings")
      .select("data")
      .eq("id", COMPANY_STANDARD_AI_SETTINGS_ID)
      .maybeSingle();
    const settings = normalizeCompanyStandardAiSettings(
      settingsRow?.data as Record<string, unknown> | undefined,
    );

    const result = await generateCompanyStandardRestructure({
      draftText,
      instructions: settings.restructurePromptInstructions,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return jsonError(error);
  }
}
