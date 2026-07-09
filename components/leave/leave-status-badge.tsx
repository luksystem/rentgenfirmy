import { Badge } from "@/components/ui/badge";
import { LEAVE_REQUEST_STATUS_LABELS, type LeaveRequestStatus } from "@/lib/leave/types";

const TONES: Record<LeaveRequestStatus, "waiting" | "active" | "critical"> = {
  pending: "waiting",
  approved: "active",
  rejected: "critical",
};

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <Badge tone={TONES[status]}>{LEAVE_REQUEST_STATUS_LABELS[status]}</Badge>;
}
