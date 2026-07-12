import type { UserProfile } from "@/lib/auth/types";
import type { ProfileProjectAccessState } from "@/lib/project-access/types";

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

export async function fetchProjectAccessibleProfiles(projectId: string): Promise<UserProfile[]> {
  const response = await fetch(`/api/projects/${projectId}/accessible-profiles`, {
    credentials: "include",
  });
  const payload = await parseJsonResponse<{ profiles: UserProfile[] }>(
    response,
    "Nie udało się wczytać użytkowników projektu.",
  );
  return payload.profiles;
}
