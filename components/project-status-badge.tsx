import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/domain";
import type { FlowStatus, Priority } from "@/lib/types";

export function ProjectStatusBadge({
  status,
  priority,
}: {
  status: FlowStatus;
  priority?: Priority;
}) {
  return <Badge tone={statusTone(status, priority)}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone =
    priority === "Krytyczny"
      ? "critical"
      : priority === "Wysoki"
        ? "waiting"
        : priority === "Niski"
          ? "closed"
          : "blue";

  return <Badge tone={tone}>{priority}</Badge>;
}
