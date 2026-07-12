import { hasFullAppAccess, type UserProfile } from "@/lib/auth/types";
import type { TimeEntry, TimeEntryStatus } from "@/lib/time-tracking/types";
import { isEditableTimeEntryStatus } from "@/lib/time-tracking/types";

export function canViewTeamTimeEntries(role: UserProfile["role"]) {
  return hasFullAppAccess(role);
}

export function canEditTimeEntry(
  actor: Pick<UserProfile, "id" | "role">,
  entry: Pick<TimeEntry, "userId" | "status">,
) {
  if (!isEditableTimeEntryStatus(entry.status)) {
    return actor.role === "administrator";
  }
  if (entry.userId === actor.id) {
    return true;
  }
  return hasFullAppAccess(actor.role);
}

export function canDeleteTimeEntry(
  actor: Pick<UserProfile, "id" | "role">,
  entry: Pick<TimeEntry, "userId" | "status">,
) {
  if (entry.status !== "draft" && actor.role !== "administrator") {
    return false;
  }
  if (entry.userId === actor.id) {
    return true;
  }
  return hasFullAppAccess(actor.role);
}

export function canCreateTimeEntryForUser(
  actor: Pick<UserProfile, "id" | "role">,
  targetUserId: string,
) {
  if (targetUserId === actor.id) {
    return true;
  }
  return hasFullAppAccess(actor.role);
}

export function canApproveTimeEntry(role: UserProfile["role"]) {
  return hasFullAppAccess(role);
}

export function assertEditableStatus(status: TimeEntryStatus, actorRole: UserProfile["role"]) {
  if (!isEditableTimeEntryStatus(status) && actorRole !== "administrator") {
    throw new Error("Ten wpis nie może być edytowany — jest już wysłany lub zaakceptowany.");
  }
}
