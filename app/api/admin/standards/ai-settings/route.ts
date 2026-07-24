import { NextResponse } from "next/server";
import {
  requireAdministratorProfile,
  requireAuthenticatedProfile,
} from "@/lib/auth/api-auth";
import { jsonError } from "@/lib/auth/http-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeCompanyStandardAiSettings,
  type CompanyStandardAiSettings,
} from "@/lib/standards/ai-settings";

const COMPANY_STANDARD_AI_SETTINGS_ID = "company_standards_ai_settings";

export async function GET() {
  try {
    await requireAuthenticatedProfile();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_settings")
      .select("data")
      .eq("id", COMPANY_STANDARD_AI_SETTINGS_ID)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    const settings = normalizeCompanyStandardAiSettings(
      data?.data as Partial<CompanyStandardAiSettings> | undefined,
    );
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    // Prompt AI dla Standardów jest edytowalny tylko przez administratora — w odróżnieniu
    // od odpowiednika w bazie wiedzy Smart Home, gdzie zapis idzie wprost z klienta pod
    // otwartym RLS na app_settings. Tu bramkujemy na poziomie route'a.
    await requireAdministratorProfile();
    const body = await request.json();
    const settings = normalizeCompanyStandardAiSettings(
      body && typeof body === "object" && "settings" in body
        ? (body as { settings: unknown }).settings as Partial<CompanyStandardAiSettings>
        : (body as Partial<CompanyStandardAiSettings>),
    );

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("app_settings")
      .upsert(
        { id: COMPANY_STANDARD_AI_SETTINGS_ID, data: settings, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
