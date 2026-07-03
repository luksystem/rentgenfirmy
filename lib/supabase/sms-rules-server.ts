import { resolveMessageTemplateVariables } from "@/lib/messages/resolve-message-variables";
import {
  getEnabledRulesForTrigger,
  normalizeSmsRulesSettings,
  renderSmsRuleMessage,
  type SmsRuleTrigger,
  type SmsRulesSettings,
} from "@/lib/sms/sms-rules";
import { sendSms } from "@/lib/sms/sendSms";
import type { Client } from "@/lib/service/types";
import { SMS_RULES_SETTINGS_ID } from "@/lib/supabase/sms-rules-repository";
import { getSupabaseServer } from "@/lib/supabase/server";

export type SmsDispatchContext = {
  clientId?: string;
  userId?: string;
  projectId?: string;
  phone?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string;
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

  const supabase = getSupabaseServer();
  const variables = await resolveMessageTemplateVariables(supabase, {
    trigger,
    clientId: context.clientId,
    userId: context.userId,
    projectId: context.projectId,
    phone: context.phone,
    fullName: context.fullName,
    firstName: context.firstName,
    lastName: context.lastName,
    email: context.email,
    location: context.location,
  });

  const phone = variables.phone?.trim() ?? "";
  if (!phone) {
    return { sent: 0, skipped: true as const, results: [], reason: "missing_phone" as const };
  }

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
        userId: context.userId ?? null,
        projectId: context.projectId ?? null,
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

export async function dispatchClientCreatedSms(
  client: Pick<Client, "id" | "phone" | "fullName" | "email" | "location">,
) {
  return dispatchSmsRules("client_created", {
    clientId: client.id,
    phone: client.phone,
    fullName: client.fullName,
    email: client.email,
    location: client.location,
  });
}

export { renderSmsRuleMessage } from "@/lib/sms/sms-rules";
