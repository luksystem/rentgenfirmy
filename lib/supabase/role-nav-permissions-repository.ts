import {
  EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
  normalizeRoleNavPermissionsConfig,
  ROLE_NAV_PERMISSIONS_SETTINGS_ID,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchRoleNavPermissionsConfig(): Promise<RoleNavPermissionsConfig> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", ROLE_NAV_PERMISSIONS_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG };
  }

  return normalizeRoleNavPermissionsConfig(data.data);
}

export async function saveRoleNavPermissionsConfig(
  config: RoleNavPermissionsConfig,
): Promise<RoleNavPermissionsConfig> {
  const supabase = getSupabase();
  const normalized = normalizeRoleNavPermissionsConfig(config);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: ROLE_NAV_PERMISSIONS_SETTINGS_ID,
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

  return normalizeRoleNavPermissionsConfig(data.data);
}
