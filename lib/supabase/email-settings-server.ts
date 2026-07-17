import {
  EMAIL_SETTINGS_ID,
  normalizeEmailSettings,
  type EmailSettings,
} from "@/lib/email/email-settings";
import {
  getNotificationActionDefinition,
  isChannelEnabled,
} from "@/lib/email/notification-routing";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  fetchSmsRulesSettingsServer,
  saveSmsRulesSettingsServer,
} from "@/lib/supabase/sms-rules-server";

export async function fetchEmailSettingsServer(): Promise<EmailSettings> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", EMAIL_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeEmailSettings(data?.data);
}

async function syncSmsRulesFromEmailRouting(settings: EmailSettings) {
  try {
    const smsSettings = await fetchSmsRulesSettingsServer();
    let changed = false;

    const nextRules = smsSettings.rules.map((rule) => {
      const action = settings.routing.find((entry) => {
        const definition = getNotificationActionDefinition(entry.id);
        return definition?.smsRuleId === rule.id;
      });
      if (!action) {
        return rule;
      }
      const enabled = isChannelEnabled(settings.routing, action.id, "sms");
      if (rule.enabled === enabled) {
        return rule;
      }
      changed = true;
      return { ...rule, enabled };
    });

    if (changed) {
      await saveSmsRulesSettingsServer({ rules: nextRules });
    }
  } catch {
    // Brak reguł SMS / błąd sync nie blokuje zapisu ustawień e-mail.
  }
}

export async function saveEmailSettingsServer(settings: EmailSettings): Promise<EmailSettings> {
  const supabase = getSupabaseServer();
  const normalized = normalizeEmailSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: EMAIL_SETTINGS_ID,
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

  const saved = normalizeEmailSettings(data.data);
  await syncSmsRulesFromEmailRouting(saved);
  return saved;
}
