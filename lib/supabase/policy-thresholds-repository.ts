// app_settings RLS jest w pełni otwarte (qual=true na SELECT/UPDATE, jak field_options) — jeden
// plik obsługuje i klienta (ROT), i serwer (cron powiadomień gwarancyjnych).
import { getSupabase } from "@/lib/supabase/client";
import {
  DEFAULT_POLICY_THRESHOLDS,
  normalizePolicyThresholds,
  type PolicyThresholds,
} from "@/lib/policy-thresholds/types";

const SETTINGS_ID = "policy_thresholds";

export async function fetchPolicyThresholds(): Promise<PolicyThresholds> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return DEFAULT_POLICY_THRESHOLDS;
  }

  return normalizePolicyThresholds(data.data as Partial<PolicyThresholds>);
}

export async function savePolicyThresholds(thresholds: PolicyThresholds): Promise<PolicyThresholds> {
  const supabase = getSupabase();
  const normalized = normalizePolicyThresholds(thresholds);
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: SETTINGS_ID, data: normalized });

  if (error) {
    throw new Error(error.message);
  }

  return normalized;
}
