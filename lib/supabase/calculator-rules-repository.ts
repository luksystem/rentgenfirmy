import { CALCULATOR_RULES_ID, normalizeCalculatorRules, type CalculatorRule } from "@/lib/calculator/rules-types";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchCalculatorRules(): Promise<CalculatorRule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", CALCULATOR_RULES_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCalculatorRules((data?.data as { rules?: unknown } | undefined)?.rules);
}

export async function saveCalculatorRules(rules: CalculatorRule[]): Promise<CalculatorRule[]> {
  const supabase = getSupabase();
  const normalized = normalizeCalculatorRules(rules);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: CALCULATOR_RULES_ID, data: { rules: normalized }, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCalculatorRules((data.data as { rules?: unknown }).rules);
}
