import type { UserProfile, UserRole } from "@/lib/auth/types";

/** Administrator zawsze ma dostęp do wszystkich projektów. */
export function roleHasImplicitAllProjects(role: UserRole) {
  return role === "administrator";
}

export function profileHasAllProjectsAccess(
  profile: Pick<UserProfile, "role"> & { allProjectsAccess?: boolean | null },
) {
  if (roleHasImplicitAllProjects(profile.role)) {
    return true;
  }
  return profile.allProjectsAccess !== false;
}

export function canAccessProject(
  profile: Pick<UserProfile, "role"> & { allProjectsAccess?: boolean | null },
  projectId: string | null | undefined,
  allowedProjectIds: Set<string> | string[] | "all",
) {
  if (!projectId) {
    return true;
  }
  if (profileHasAllProjectsAccess(profile)) {
    return true;
  }
  if (allowedProjectIds === "all") {
    return true;
  }
  const ids = allowedProjectIds instanceof Set ? allowedProjectIds : new Set(allowedProjectIds);
  return ids.has(projectId);
}
