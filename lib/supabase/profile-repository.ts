import { getUserDisplayName, STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

export async function fetchTeamProfiles(): Promise<UserProfile[]> {
  const supabase = getSupabase();
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

export function profileToOptionLabel(profile: UserProfile) {
  return getUserDisplayName(profile);
}
