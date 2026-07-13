import type { WorkItemStatus } from "@/lib/my-work/types";
import type { ProjectProcessItemStatus } from "@/lib/process/types";

export function mapWorkItemStatusToProcessItemStatus(
  status: WorkItemStatus,
): ProjectProcessItemStatus | null {
  switch (status) {
    case "draft":
    case "planned":
    case "sent":
    case "pending_ack":
      return "open";
    case "accepted":
    case "in_progress":
    case "blocked":
    case "risk_reported":
    case "needs_clarification":
    case "deferred":
      return "in_progress";
    case "done":
    case "pending_verification":
    case "verified":
      return "completed";
    case "not_done":
    case "cancelled":
      return "open";
    default:
      return null;
  }
}

export function shouldMarkProcessItemCompleted(status: WorkItemStatus) {
  return status === "done" || status === "pending_verification" || status === "verified";
}

export function shouldClearProcessItemCompletion(status: WorkItemStatus) {
  return status === "not_done" || status === "cancelled";
}
