import { getSupabaseServer } from "@/lib/supabase/server";
import {
  LEAVE_CARD_TEMPLATE_SETTINGS_ID,
  normalizeLeaveCardTemplateSettings,
  type LeaveCardTemplateSettings,
} from "@/lib/leave/leave-settings";

export async function fetchLeaveCardTemplateSettingsServer(): Promise<LeaveCardTemplateSettings> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", LEAVE_CARD_TEMPLATE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeLeaveCardTemplateSettings(data?.data);
}

export async function saveLeaveCardTemplateSettingsServer(
  settings: LeaveCardTemplateSettings,
): Promise<LeaveCardTemplateSettings> {
  const supabase = getSupabaseServer();
  const normalized = normalizeLeaveCardTemplateSettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: LEAVE_CARD_TEMPLATE_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeLeaveCardTemplateSettings(data.data);
}
