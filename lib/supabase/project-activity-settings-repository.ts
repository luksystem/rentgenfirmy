import { getSupabase } from "@/lib/supabase/client";
import {
  PROJECT_ACTIVITY_SETTINGS_ID,
  normalizeProjectActivitySettings,
  type ProjectActivitySettings,
} from "@/lib/project-activity/settings";

export async function fetchProjectActivitySettings(): Promise<ProjectActivitySettings> {
  const supabase = getSupabase();
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

export async function saveProjectActivitySettings(
  settings: ProjectActivitySettings,
): Promise<ProjectActivitySettings> {
  const supabase = getSupabase();
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
