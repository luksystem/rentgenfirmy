import { getSupabase } from "@/lib/supabase/client";
import {
  BUDGET_FORECAST_SETTINGS_ID,
  DEFAULT_BUDGET_FORECAST_SETTINGS,
  normalizeBudgetForecastSettings,
  type BudgetForecastSettings,
} from "@/lib/budget-forecast/types";

export async function fetchBudgetForecastSettings(): Promise<BudgetForecastSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", BUDGET_FORECAST_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return { ...DEFAULT_BUDGET_FORECAST_SETTINGS };
  }

  return normalizeBudgetForecastSettings(data.data);
}

export async function saveBudgetForecastSettings(
  settings: BudgetForecastSettings,
): Promise<BudgetForecastSettings> {
  const supabase = getSupabase();
  const normalized = normalizeBudgetForecastSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: BUDGET_FORECAST_SETTINGS_ID,
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

  return normalizeBudgetForecastSettings(data.data);
}
