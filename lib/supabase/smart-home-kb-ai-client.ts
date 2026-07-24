import type { SmartHomeKbArticleStep } from "@/lib/smart-home-kb/types";
import {
  DEFAULT_SMART_HOME_KB_AI_SETTINGS,
  normalizeSmartHomeKbAiSettings,
  type SmartHomeKbAiSettings,
} from "@/lib/smart-home-kb/ai-settings";
import { getSupabase } from "@/lib/supabase/client";

const SMART_HOME_KB_AI_SETTINGS_ID = "smart_home_kb_ai_settings";

export type SmartHomeKbRestructureResult = {
  contextHtml: string;
  steps: SmartHomeKbArticleStep[];
  tipsHtml: string;
};

export async function restructureSmartHomeKbContent(
  draftText: string,
): Promise<SmartHomeKbRestructureResult> {
  const response = await fetch("/api/smart-home-kb/restructure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftText }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Nie udało się uporządkować treści.");
  }

  return payload.result as SmartHomeKbRestructureResult;
}

export async function fetchSmartHomeKbAiSettings(): Promise<SmartHomeKbAiSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SMART_HOME_KB_AI_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.data) {
    return DEFAULT_SMART_HOME_KB_AI_SETTINGS;
  }
  return normalizeSmartHomeKbAiSettings(data.data as Partial<SmartHomeKbAiSettings>);
}

export async function saveSmartHomeKbAiSettings(
  settings: SmartHomeKbAiSettings,
): Promise<SmartHomeKbAiSettings> {
  const supabase = getSupabase();
  const normalized = normalizeSmartHomeKbAiSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: SMART_HOME_KB_AI_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return normalizeSmartHomeKbAiSettings(data.data as Partial<SmartHomeKbAiSettings>);
}
