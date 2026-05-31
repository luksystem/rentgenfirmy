import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/domain";
import type { Priority } from "@/lib/types";

export function ProjectStatusBadge({
  status,
  priority,
  isActive,
}: {
  status: string;
  priority?: Priority;
  isActive?: boolean;
}) {
  return <Badge tone={statusTone(status, priority, isActive)}>{status}</Badge>;
}

export function ActiveBadge() {
  return <Badge tone="active">Aktywny</Badge>;
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
