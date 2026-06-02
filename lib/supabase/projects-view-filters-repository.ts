import {
  DEFAULT_PROJECTS_VIEW_FILTERS,
  isDefaultProjectsViewFilters,
  migrateProjectsViewFiltersFromLocalStorage,
  normalizeProjectsViewFilters,
  type ProjectsViewFilters,
} from "@/lib/projects-view-filters";
import { getSupabase } from "@/lib/supabase/client";

const SETTINGS_ID = "projects_view_filters";
const LEGACY_STORAGE_KEY = "rentgen-projects-view-filters";

function clearLegacyLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function fetchProjectsViewFilters(): Promise<ProjectsViewFilters> {
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
    const migrated = migrateProjectsViewFiltersFromLocalStorage();
    if (!isDefaultProjectsViewFilters(migrated)) {
      const saved = await saveProjectsViewFilters(migrated);
      clearLegacyLocalStorage();
      return saved;
    }

    clearLegacyLocalStorage();
    return DEFAULT_PROJECTS_VIEW_FILTERS;
  }

  clearLegacyLocalStorage();
  return normalizeProjectsViewFilters(data.data as Partial<ProjectsViewFilters>);
}

export async function saveProjectsViewFilters(
  filters: ProjectsViewFilters,
): Promise<ProjectsViewFilters> {
  const supabase = getSupabase();
  const normalized = normalizeProjectsViewFilters(filters);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: SETTINGS_ID,
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

  return normalizeProjectsViewFilters(data.data as Partial<ProjectsViewFilters>);
}
