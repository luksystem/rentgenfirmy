import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";

export function mergeAgreementsById(
  primary: ProjectClientAgreement[],
  secondary?: ProjectClientAgreement[],
): ProjectClientAgreement[] {
  const map = new Map<string, ProjectClientAgreement>();
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
