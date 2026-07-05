import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";

export function mergeChangeRequestsById(
  primary: ProjectChangeRequest[],
  secondary?: ProjectChangeRequest[],
): ProjectChangeRequest[] {
  const map = new Map<string, ProjectChangeRequest>();
  for (const item of secondary ?? []) {
    map.set(item.id, item);
  }
  for (const item of primary) {
    map.set(item.id, item);
  }

  return [...map.values()].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}
