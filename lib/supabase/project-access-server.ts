import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth/types";
import { profileHasAllProjectsAccess, roleHasImplicitAllProjects } from "@/lib/project-access/rules";
import type { ProfileProjectAccessState } from "@/lib/project-access/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";

type AdminClient = SupabaseClient;

export async function fetchProfileProjectAccessServer(
  admin: AdminClient,
  profileId: string,
): Promise<ProfileProjectAccessState> {
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("id, role, all_projects_access")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profileRow) {
    throw new Error("Nie znaleziono użytkownika.");
  }

  const role = profileRow.role as UserProfile["role"];
  if (roleHasImplicitAllProjects(role)) {
    return { allProjectsAccess: true, projectIds: [] };
  }

  const allProjectsAccess = profileRow.all_projects_access !== false;
  if (allProjectsAccess) {
    return { allProjectsAccess: true, projectIds: [] };
  }

  const { data: rows, error } = await admin
    .from("profile_project_access")
    .select("project_id")
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    allProjectsAccess: false,
    projectIds: (rows ?? []).map((row) => row.project_id as string),
  };
}

export async function saveProfileProjectAccessServer(
  admin: AdminClient,
  profileId: string,
  input: ProfileProjectAccessState,
) {
  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profileRow) {
    throw new Error("Nie znaleziono użytkownika.");
  }

  const role = profileRow.role as UserProfile["role"];
  if (roleHasImplicitAllProjects(role)) {
    return fetchProfileProjectAccessServer(admin, profileId);
  }

  const allProjectsAccess = input.allProjectsAccess !== false;
  const projectIds = allProjectsAccess ? [] : [...new Set(input.projectIds.filter(Boolean))];

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      all_projects_access: allProjectsAccess,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await admin
    .from("profile_project_access")
    .delete()
    .eq("profile_id", profileId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!allProjectsAccess && projectIds.length) {
    const { error: insertError } = await admin.from("profile_project_access").insert(
      projectIds.map((projectId) => ({
        profile_id: profileId,
        project_id: projectId,
      })),
    );
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return fetchProfileProjectAccessServer(admin, profileId);
}

export async function fetchAccessibleProjectIdsForUserServer(
  admin: AdminClient,
  profile: Pick<UserProfile, "id" | "role"> & { allProjectsAccess?: boolean | null },
): Promise<"all" | string[]> {
  if (profileHasAllProjectsAccess(profile)) {
    return "all";
  }

  const { data, error } = await admin
    .from("profile_project_access")
    .select("project_id")
    .eq("profile_id", profile.id);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.project_id as string);
}

export async function fetchProfilesWithProjectAccessServer(
  admin: AdminClient,
  projectId: string,
) {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("role", ["administrator", "manager", "pracownik"])
    .order("last_name");
  if (error) {
    throw new Error(error.message);
  }

  const { data: accessRows, error: accessError } = await admin
    .from("profile_project_access")
    .select("profile_id")
    .eq("project_id", projectId);
  if (accessError) {
    throw new Error(accessError.message);
  }

  const explicitIds = new Set((accessRows ?? []).map((row) => row.profile_id as string));

  return (profiles ?? [])
    .map((row) => mapProfileRow(row))
    .filter((profile) => {
      if (profileHasAllProjectsAccess(profile)) {
        return true;
      }
      return explicitIds.has(profile.id);
    });
}

export async function assertUserCanAccessProjectServer(
  admin: AdminClient,
  profile: Pick<UserProfile, "id" | "role"> & { allProjectsAccess?: boolean | null },
  projectId: string | null | undefined,
) {
  if (!projectId) {
    return;
  }
  const allowed = await fetchAccessibleProjectIdsForUserServer(admin, profile);
  if (allowed === "all") {
    return;
  }
  if (!allowed.includes(projectId)) {
    throw new Error("Brak dostępu do tego projektu.");
  }
}

export async function assertAssigneeHasProjectAccessServer(
  admin: AdminClient,
  assigneeId: string | null | undefined,
  projectId: string | null | undefined,
) {
  if (!projectId || !assigneeId) {
    return;
  }
  const { data, error } = await admin.from("profiles").select("*").eq("id", assigneeId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Nie znaleziono użytkownika przypisanego.");
  }
  await assertUserCanAccessProjectServer(admin, mapProfileRow(data), projectId);
}
