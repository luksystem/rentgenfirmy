import { hasFullAppAccess, type UserProfile } from "@/lib/auth/types";
import type { WorkItem, WorkItemView } from "@/lib/my-work/types";

export function canManagerWorkItems(role: UserProfile["role"]) {
  return hasFullAppAccess(role);
}

export function canEditWorkItem(
  actor: Pick<UserProfile, "id" | "role">,
  item: Pick<WorkItemView, "managerId" | "status" | "sourceType">,
) {
  if (!canManagerWorkItems(actor.role) && item.managerId !== actor.id) {
    return false;
  }
  if (item.status === "verified") {
    return actor.role === "administrator";
  }
  if (item.status === "cancelled") {
    return actor.role === "administrator";
  }
  return true;
}

export function canDeleteWorkItem(
  actor: Pick<UserProfile, "role">,
  item: Pick<WorkItem, "status" | "sourceType">,
) {
  if (!canManagerWorkItems(actor.role)) {
    return false;
  }
  return item.status !== "verified";
}
