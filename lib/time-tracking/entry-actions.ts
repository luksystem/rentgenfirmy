import type { UserRole } from "@/lib/auth/types";
import { canDeleteTimeEntry, canEditTimeEntry } from "@/lib/time-tracking/permissions";
import type { TimeEntryView } from "@/lib/time-tracking/types";

export function canEditTimeEntryInUi(
  actor: { id: string; role: UserRole } | null | undefined,
  entry: Pick<TimeEntryView, "userId" | "status">,
): boolean {
  if (!actor) {
    return false;
  }
  return canEditTimeEntry(actor, entry);
}

export function canDeleteTimeEntryInUi(
  actor: { id: string; role: UserRole } | null | undefined,
  entry: Pick<TimeEntryView, "userId" | "status">,
): boolean {
  if (!actor) {
    return false;
  }
  return canDeleteTimeEntry(actor, entry);
}
