import {
  defaultSmsRulesSettings,
  normalizeSmsRulesSettings,
  type SmsRulesSettings,
} from "@/lib/sms/sms-rules";
import { getSupabase } from "@/lib/supabase/client";

export const SMS_RULES_SETTINGS_ID = "sms_rules_settings";

export async function fetchSmsRulesSettings(): Promise<SmsRulesSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SMS_RULES_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return defaultSmsRulesSettings();
  }

  return normalizeSmsRulesSettings(data.data);
}

export async function saveSmsRulesSettings(
  settings: SmsRulesSettings,
): Promise<SmsRulesSettings> {
  const supabase = getSupabase();
  const normalized = normalizeSmsRulesSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: SMS_RULES_SETTINGS_ID,
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

  return normalizeSmsRulesSettings(data.data);
}
