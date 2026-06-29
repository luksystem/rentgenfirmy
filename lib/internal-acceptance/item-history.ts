import type { InternalAcceptanceHistoryEntry, InternalAcceptanceItemState, InternalAcceptanceStatus } from "@/lib/internal-acceptance/types";
import { INTERNAL_ACCEPTANCE_STATUS_LABELS } from "@/lib/internal-acceptance/types";

export function createHistoryEntry(input: {
  actorId?: string;
  actorName: string;
  action: InternalAcceptanceHistoryEntry["action"];
  status?: InternalAcceptanceStatus;
  previousStatus?: InternalAcceptanceStatus;
  message: string;
}): InternalAcceptanceHistoryEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    status: input.status,
    previousStatus: input.previousStatus,
    message: input.message,
  };
}

export function appendItemHistory(
  item: InternalAcceptanceItemState,
  entry: InternalAcceptanceHistoryEntry,
): InternalAcceptanceItemState {
  return {
    ...item,
    history: [entry, ...(item.history ?? [])].slice(0, 100),
    lastUpdatedAt: entry.at,
    lastUpdatedById: entry.actorId,
    lastUpdatedByName: entry.actorName,
  };
}

export function statusChangeMessage(
  previousStatus: InternalAcceptanceStatus,
  nextStatus: InternalAcceptanceStatus,
): string {
  return `Status: ${INTERNAL_ACCEPTANCE_STATUS_LABELS[previousStatus]} → ${INTERNAL_ACCEPTANCE_STATUS_LABELS[nextStatus]}`;
}

export function applyInternalAcceptanceItemPatch(
  item: InternalAcceptanceItemState,
  patch: Partial<InternalAcceptanceItemState>,
  actor: { id?: string; name: string },
): InternalAcceptanceItemState {
  const nextStatus = patch.status ?? item.status;
  let next: InternalAcceptanceItemState = {
    ...item,
    ...patch,
    status: nextStatus,
    completedAt:
      patch.completedAt ??
      (nextStatus === "PASSED" || nextStatus === "NOT_APPLICABLE"
        ? new Date().toISOString()
        : nextStatus === "NOT_STARTED" || nextStatus === "IN_PROGRESS" || nextStatus === "FAILED"
          ? undefined
          : item.completedAt),
  };

  if (patch.status && patch.status !== item.status) {
    next = appendItemHistory(
      next,
      createHistoryEntry({
        actorId: actor.id,
        actorName: actor.name,
        action: "status_change",
        status: patch.status,
        previousStatus: item.status,
        message: statusChangeMessage(item.status, patch.status),
      }),
    );
  }

  if (patch.notes !== undefined && patch.notes !== item.notes) {
    next = appendItemHistory(
      next,
      createHistoryEntry({
        actorId: actor.id,
        actorName: actor.name,
        action: "note_updated",
        message: patch.notes.trim()
          ? `Dodano / zmieniono uwagi: ${patch.notes.trim()}`
          : "Usunięto uwagi",
      }),
    );
  }

  if (
    patch.failureReason !== undefined ||
    patch.fixAssignee !== undefined ||
    patch.fixAssigneeId !== undefined ||
    patch.fixDeadline !== undefined
  ) {
    const parts: string[] = [];
    if (patch.failureReason !== undefined && patch.failureReason !== item.failureReason) {
      parts.push(`Opis problemu: ${patch.failureReason.trim() || "—"}`);
    }
    if (
      (patch.fixAssignee !== undefined && patch.fixAssignee !== item.fixAssignee) ||
      (patch.fixAssigneeId !== undefined && patch.fixAssigneeId !== item.fixAssigneeId)
    ) {
      parts.push(`Osoba: ${patch.fixAssignee?.trim() || item.fixAssignee?.trim() || "—"}`);
    }
    if (patch.fixDeadline !== undefined && patch.fixDeadline !== item.fixDeadline) {
      parts.push(`Termin: ${patch.fixDeadline || "—"}`);
    }
    if (parts.length) {
      next = appendItemHistory(
        next,
        createHistoryEntry({
          actorId: actor.id,
          actorName: actor.name,
          action: "failure_details_updated",
          status: next.status,
          message: parts.join(" · "),
        }),
      );
    }
  }

  if (
    (patch.assigneeName !== undefined || patch.assigneeId !== undefined) &&
    !patch.status &&
    (patch.assigneeId !== item.assigneeId || patch.assigneeName !== item.assigneeName)
  ) {
    next = appendItemHistory(
      next,
      createHistoryEntry({
        actorId: actor.id,
        actorName: actor.name,
        action: "assignee_updated",
        message: `Przypisano: ${patch.assigneeName?.trim() || item.assigneeName?.trim() || "—"}`,
      }),
    );
  }

  return next;
}
