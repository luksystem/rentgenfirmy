import {
  GOALS_MODULE_SETTINGS_ID,
  defaultGoalModuleSettings,
  normalizeGoalModuleSettings,
  type GoalModuleSettings,
} from "@/lib/goals/module-settings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabase } from "@/lib/supabase/client";

async function readGoalModuleSettingsFrom(
  client: ReturnType<typeof getSupabase> | ReturnType<typeof getSupabaseAdmin>,
): Promise<GoalModuleSettings> {
  const { data, error } = await client
    .from("app_settings")
    .select("data")
    .eq("id", GOALS_MODULE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return defaultGoalModuleSettings();
  }

  return normalizeGoalModuleSettings(data.data);
}

export async function fetchGoalModuleSettings(): Promise<GoalModuleSettings> {
  return readGoalModuleSettingsFrom(getSupabase());
}

/** Wariant serwerowy (API / admin) — bez klienta przeglądarkowego. */
export async function fetchGoalModuleSettingsAdmin(): Promise<GoalModuleSettings> {
  return readGoalModuleSettingsFrom(getSupabaseAdmin());
}

export async function saveGoalModuleSettings(settings: GoalModuleSettings): Promise<GoalModuleSettings> {
  const supabase = getSupabase();
  const normalized = normalizeGoalModuleSettings(settings);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: GOALS_MODULE_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeGoalModuleSettings(data.data);
}
