import {
  COMPANY_PROFILE_SETTINGS_ID,
  DEFAULT_COMPANY_PROFILE,
  normalizeCompanyProfile,
  type CompanyProfile,
} from "@/lib/company/company-profile";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", COMPANY_PROFILE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return { ...DEFAULT_COMPANY_PROFILE };
  }

  return normalizeCompanyProfile(data.data);
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  const supabase = getSupabase();
  const normalized = normalizeCompanyProfile(profile);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: COMPANY_PROFILE_SETTINGS_ID,
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCompanyProfile(data.data);
}
