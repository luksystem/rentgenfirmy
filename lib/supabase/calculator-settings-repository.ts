import { CALCULATOR_SETTINGS_ID, normalizeCalculatorSettings, type CalculatorSettings } from "@/lib/calculator/settings";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchCalculatorSettings(): Promise<CalculatorSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", CALCULATOR_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCalculatorSettings(data?.data);
}

export async function saveCalculatorSettings(settings: CalculatorSettings): Promise<CalculatorSettings> {
  const supabase = getSupabase();
  const normalized = normalizeCalculatorSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: CALCULATOR_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCalculatorSettings(data.data);
}
