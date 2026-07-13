import {
  EMPTY_ROLE_NAV_PERMISSIONS_CONFIG,
  normalizeRoleNavPermissionsConfig,
  ROLE_NAV_PERMISSIONS_SETTINGS_ID,
  type RoleNavPermissionsConfig,
} from "@/lib/navigation/role-nav-permissions";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function fetchRoleNavPermissionsConfigServer(): Promise<RoleNavPermissionsConfig> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", ROLE_NAV_PERMISSIONS_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("fetchRoleNavPermissionsConfigServer:", error.message);
    return { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG };
  }

  if (!data?.data) {
    return { ...EMPTY_ROLE_NAV_PERMISSIONS_CONFIG };
  }

  return normalizeRoleNavPermissionsConfig(data.data);
}
