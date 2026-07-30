import { getUserDisplayName, STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import type { NavModuleKey } from "@/lib/navigation/nav-modules";
import { canAccessNavModule } from "@/lib/navigation/role-nav-permissions";
import { fetchRoleNavPermissionsConfigServer } from "@/lib/navigation/role-nav-permissions-server";

/**
 * Aktywni pracownicy. Podanie `requiredNavModule` filtruje wynik do osob, ktorych rola ma
 * dostep do danej strefy nawigacji (np. powiadomienia o ofertach nie powinny trafiac do
 * osob bez dostepu do modulu "service-offers") — wg tych samych uprawnien co menu i middleware.
 * Bez parametru zwraca wszystkich (dotychczasowe zachowanie, dla widokow typu grafik/XP/oceny,
 * ktore celowo obejmuja caly zespol niezaleznie od stref).
 */
export async function fetchTeamProfilesServer(requiredNavModule?: NavModuleKey): Promise<UserProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("role", [...STAFF_ROLES])
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []).map(mapProfileRow);
  if (!requiredNavModule) {
    return profiles;
  }

  const config = await fetchRoleNavPermissionsConfigServer();
  return profiles.filter((profile) => canAccessNavModule(profile.role, requiredNavModule, config));
}

export function profileToOptionLabelServer(profile: UserProfile) {
  return getUserDisplayName(profile);
}
