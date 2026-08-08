import {
  CALCULATOR_RULES_ID,
  DEFAULT_LABOR_ROLE_RATES,
  normalizeCalculatorRules,
  normalizeLaborRoleRates,
  type CalculatorRule,
  type LaborRoleRates,
} from "@/lib/calculator/rules-types";
import { getSupabase } from "@/lib/supabase/client";

export type CalculatorRulesBundle = {
  rules: CalculatorRule[];
  laborRoleRates: LaborRoleRates;
};

export async function fetchCalculatorRules(): Promise<CalculatorRulesBundle> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", CALCULATOR_RULES_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const raw = data?.data as { rules?: unknown; laborRoleRates?: unknown } | undefined;
  return {
    rules: normalizeCalculatorRules(raw?.rules),
    laborRoleRates: normalizeLaborRoleRates(raw?.laborRoleRates),
  };
}

export async function saveCalculatorRules(
  rules: CalculatorRule[],
  laborRoleRates: LaborRoleRates = DEFAULT_LABOR_ROLE_RATES,
): Promise<CalculatorRulesBundle> {
  const supabase = getSupabase();
  const normalizedRules = normalizeCalculatorRules(rules);
  const normalizedRates = normalizeLaborRoleRates(laborRoleRates);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: CALCULATOR_RULES_ID,
        data: { rules: normalizedRules, laborRoleRates: normalizedRates },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const raw = data.data as { rules?: unknown; laborRoleRates?: unknown };
  return {
    rules: normalizeCalculatorRules(raw.rules),
    laborRoleRates: normalizeLaborRoleRates(raw.laborRoleRates),
  };
}
