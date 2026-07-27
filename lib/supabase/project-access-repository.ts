import type { UserProfile } from "@/lib/auth/types";
import type { ProfileProjectAccessState } from "@/lib/project-access/types";

export type ProjectRoleFlags = {
  technicalLead: boolean;
  operationalLead: boolean;
  developer: boolean;
};

export type ProjectRoleSlotSource = "obsada" | "fallback" | "zastepstwo" | "przejecie_czerwone";

export type ProjectAssignedProfile = UserProfile &
  ProjectRoleFlags & {
    /** Źródło slotu pod każdą rolą — brak klucza = nieobsadzona. UI musi odróżnić 'fallback' od 'obsada'. */
    roleSources: Partial<Record<keyof ProjectRoleFlags, ProjectRoleSlotSource>>;
  };

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? fallbackError);
  }
  return payload as T;
}

export async function fetchUserProjectAccess(userId: string): Promise<ProfileProjectAccessState> {
  const response = await fetch(`/api/admin/users/${userId}/project-access`, { credentials: "include" });
  const payload = await parseJsonResponse<{ access: ProfileProjectAccessState }>(
    response,
    "Nie udało się wczytać dostępu do projektów.",
  );
  return payload.access;
}

export async function saveUserProjectAccess(
  userId: string,
  access: ProfileProjectAccessState,
): Promise<ProfileProjectAccessState> {
  const response = await fetch(`/api/admin/users/${userId}/project-access`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(access),
  });
  const payload = await parseJsonResponse<{ access: ProfileProjectAccessState }>(
    response,
    "Nie udało się zapisać dostępu do projektów.",
  );
  return payload.access;
}

export async function fetchProjectAccessibleProfiles(
  projectId: string,
): Promise<ProjectAssignedProfile[]> {
  const response = await fetch(`/api/projects/${projectId}/accessible-profiles`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ profiles: ProjectAssignedProfile[] }>(
    response,
    "Nie udało się wczytać użytkowników projektu.",
  );
  return payload.profiles;
}

export type ProjectRoleSlotEntry = {
  roleCode: string;
  roleLabel: string;
  profile: UserProfile | null;
  source: ProjectRoleSlotSource | null;
};

/** Jak fetchProjectAccessibleProfiles, ale w jednym zapytaniu dokłada nieagregowaną (7-slotową) obsadę — patrz project-users-panel.tsx. */
export async function fetchProjectAccessibleProfilesWithSlots(
  projectId: string,
): Promise<{ profiles: ProjectAssignedProfile[]; slots: ProjectRoleSlotEntry[] }> {
  const response = await fetch(`/api/projects/${projectId}/accessible-profiles`, {
    credentials: "include",
  });
  return parseJsonResponse<{ profiles: ProjectAssignedProfile[]; slots: ProjectRoleSlotEntry[] }>(
    response,
    "Nie udało się wczytać użytkowników projektu.",
  );
}

export async function setProjectRoleFlag(
  projectId: string,
  profileId: string,
  field: keyof ProjectRoleFlags,
  value: boolean,
): Promise<{ profiles: ProjectAssignedProfile[]; slots: ProjectRoleSlotEntry[] }> {
  const response = await fetch(
    `/api/projects/${projectId}/accessible-profiles/${profileId}/role`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    },
  );
  return parseJsonResponse<{ profiles: ProjectAssignedProfile[]; slots: ProjectRoleSlotEntry[] }>(
    response,
    "Nie udało się zapisać roli projektowej.",
  );
}
