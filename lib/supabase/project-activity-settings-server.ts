import { getSupabaseServer } from "@/lib/supabase/server";
import {
  PROJECT_ACTIVITY_SETTINGS_ID,
  normalizeProjectActivitySettings,
  type ProjectActivitySettings,
} from "@/lib/project-activity/settings";

export async function fetchProjectActivitySettingsServer(): Promise<ProjectActivitySettings> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", PROJECT_ACTIVITY_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProjectActivitySettings(data?.data);
}

export async function saveProjectActivitySettingsServer(
  settings: ProjectActivitySettings,
): Promise<ProjectActivitySettings> {
  const supabase = getSupabaseServer();
  const normalized = normalizeProjectActivitySettings(settings);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: PROJECT_ACTIVITY_SETTINGS_ID,
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

  return normalizeProjectActivitySettings(data.data);
}
