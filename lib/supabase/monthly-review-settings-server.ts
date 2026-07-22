import { getSupabaseServer } from "@/lib/supabase/server";
import {
  MONTHLY_REVIEW_SETTINGS_ID,
  normalizeMonthlyReviewSettings,
  type MonthlyReviewSettings,
} from "@/lib/monthly-reviews/settings";

export async function fetchMonthlyReviewSettingsServer(): Promise<MonthlyReviewSettings> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", MONTHLY_REVIEW_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMonthlyReviewSettings(data?.data);
}

export async function saveMonthlyReviewSettingsServer(
  settings: MonthlyReviewSettings,
): Promise<MonthlyReviewSettings> {
  const supabase = getSupabaseServer();
  const normalized = normalizeMonthlyReviewSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: MONTHLY_REVIEW_SETTINGS_ID,
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

  return normalizeMonthlyReviewSettings(data.data);
}
