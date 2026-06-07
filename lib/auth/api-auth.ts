import { createClient } from "@/lib/supabase/server-auth";
import { isAdministratorRole, type UserProfile } from "@/lib/auth/types";
import { HttpError } from "@/lib/auth/http-error";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

export async function getSessionProfile(): Promise<{
  userId: string;
  profile: UserProfile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const profile = mapProfileRow(data);
  if (!profile.isActive) {
    return null;
  }

  return { userId: user.id, profile };
}

export async function requireAuthenticatedProfile() {
  const session = await getSessionProfile();
  if (!session) {
    throw new HttpError(401, "Wymagane logowanie.");
  }
  return session;
}

export async function requireAdministratorProfile() {
  const session = await requireAuthenticatedProfile();
  if (!isAdministratorRole(session.profile.role)) {
    throw new HttpError(403, "Brak uprawnień administratora.");
  }
  return session;
}
