import {
  getEnabledRulesForTrigger,
  normalizeSmsRulesSettings,
  renderSmsRuleMessage,
  type SmsRuleTrigger,
  type SmsRulesSettings,
} from "@/lib/sms/sms-rules";
import { sendSms } from "@/lib/sms/sendSms";
import { SMS_RULES_SETTINGS_ID } from "@/lib/supabase/sms-rules-repository";
import { getSupabaseServer } from "@/lib/supabase/server";

export type SmsDispatchContext = {
  clientId?: string;
  phone?: string;
  fullName?: string;
};

export async function fetchSmsRulesSettingsServer() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SMS_RULES_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSmsRulesSettings(data?.data);
}

export async function saveSmsRulesSettingsServer(
  settings: SmsRulesSettings,
): Promise<SmsRulesSettings> {
  const supabase = getSupabaseServer();
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

export async function dispatchSmsRules(
  trigger: SmsRuleTrigger,
  context: SmsDispatchContext,
) {
  const settings = await fetchSmsRulesSettingsServer();
  const rules = getEnabledRulesForTrigger(settings, trigger);

  if (rules.length === 0) {
    return { sent: 0, skipped: true as const, results: [] };
  }

  let phone = context.phone?.trim() ?? "";
  let fullName = context.fullName?.trim() ?? "";

  if ((!phone || !fullName) && context.clientId) {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("clients")
      .select("phone, full_name")
      .eq("id", context.clientId)
      .maybeSingle();

    if (!phone) {
      phone = data?.phone?.trim() ?? "";
    }
    if (!fullName && data?.full_name) {
      fullName = data.full_name;
    }
  }

  if (!phone) {
    return { sent: 0, skipped: true as const, results: [], reason: "missing_phone" as const };
  }

  const variables = {
    fullName,
    phone,
  };

  const results = [];

  for (const rule of rules) {
    const message = renderSmsRuleMessage(rule.messageTemplate, variables).trim();
    if (!message) {
      continue;
    }

    const result = await sendSms({
      phone,
      message,
      metadata: {
        type: "sms_rule",
        ruleId: rule.id,
        trigger,
        clientId: context.clientId ?? null,
      },
    });

    results.push({ ruleId: rule.id, result });
  }

  return {
    sent: results.filter((entry) => entry.result.status === "sent").length,
    skipped: false as const,
    results,
  };
}
