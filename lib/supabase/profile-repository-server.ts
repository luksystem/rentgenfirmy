import { getUserDisplayName, STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

export async function fetchTeamProfilesServer(): Promise<UserProfile[]> {
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

  return (data ?? []).map(mapProfileRow);
}

export function profileToOptionLabelServer(profile: UserProfile) {
  return getUserDisplayName(profile);
}
