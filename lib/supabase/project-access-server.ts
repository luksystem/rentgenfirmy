import type { SupabaseClient } from "@supabase/supabase-js";
import { STAFF_ROLES, type UserProfile } from "@/lib/auth/types";
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
    .in("role", [...STAFF_ROLES])
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

export type ProjectRoleFlags = {
  technicalLead: boolean;
  operationalLead: boolean;
  developer: boolean;
};

export type ProjectAssignedProfile = UserProfile & ProjectRoleFlags;

type ProjectRoleRow = {
  profile_id: string;
  is_technical_lead: boolean | null;
  is_operational_lead: boolean | null;
  is_developer: boolean | null;
};

/** Osoby z dostępem do projektu wraz z rolami projektowymi (lider techniczny/operacyjny, programista). */
export async function fetchProjectAssignedProfilesServer(
  admin: AdminClient,
  projectId: string,
): Promise<ProjectAssignedProfile[]> {
  const profiles = await fetchProfilesWithProjectAccessServer(admin, projectId);

  const { data: roleRows, error } = await admin
    .from("profile_project_access")
    .select("profile_id, is_technical_lead, is_operational_lead, is_developer")
    .eq("project_id", projectId);
  if (error) {
    throw new Error(error.message);
  }

  const rolesByProfileId = new Map(
    ((roleRows ?? []) as ProjectRoleRow[]).map((row) => [row.profile_id, row]),
  );

  return profiles.map((profile) => {
    const roleRow = rolesByProfileId.get(profile.id);
    return {
      ...profile,
      technicalLead: roleRow?.is_technical_lead === true,
      operationalLead: roleRow?.is_operational_lead === true,
      developer: roleRow?.is_developer === true,
    };
  });
}

const PROJECT_ROLE_FIELD_COLUMNS = {
  technicalLead: "is_technical_lead",
  operationalLead: "is_operational_lead",
  developer: "is_developer",
} as const;

/** Ustawia flagę roli projektowej dla pary (profil, projekt) — tworzy wiersz jeśli jeszcze nie istnieje. */
export async function setProjectRoleFlagServer(
  admin: AdminClient,
  input: { projectId: string; profileId: string; field: keyof ProjectRoleFlags; value: boolean },
) {
  const column = PROJECT_ROLE_FIELD_COLUMNS[input.field];

  const { data: existing, error: fetchError } = await admin
    .from("profile_project_access")
    .select("profile_id")
    .eq("project_id", input.projectId)
    .eq("profile_id", input.profileId)
    .maybeSingle();
  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (existing) {
    const { error } = await admin
      .from("profile_project_access")
      .update({ [column]: input.value })
      .eq("project_id", input.projectId)
      .eq("profile_id", input.profileId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await admin.from("profile_project_access").insert({
    project_id: input.projectId,
    profile_id: input.profileId,
    [column]: input.value,
  });
  if (error) {
    throw new Error(error.message);
  }
}

/** Odbiorcy powiadomień projektowych (akceptacje itp.) — tylko liderzy i programista, nie cały zespół. */
export async function fetchProjectNotificationRecipientsServer(
  admin: AdminClient,
  projectId: string,
): Promise<UserProfile[]> {
  const { data: roleRows, error } = await admin
    .from("profile_project_access")
    .select("profile_id")
    .eq("project_id", projectId)
    .or("is_technical_lead.eq.true,is_operational_lead.eq.true,is_developer.eq.true");
  if (error) {
    throw new Error(error.message);
  }

  const profileIds = [...new Set((roleRows ?? []).map((row) => row.profile_id as string))];
  if (!profileIds.length) {
    return [];
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .in("id", profileIds);
  if (profilesError) {
    throw new Error(profilesError.message);
  }

  return (profiles ?? []).map((row) => mapProfileRow(row));
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
