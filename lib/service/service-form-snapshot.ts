import type { ServiceRecord } from "@/lib/service/types";

export function createServiceFormSnapshot(
  service: ServiceRecord,
  withoutProject: boolean,
) {
  return JSON.stringify(
    {
      ...service,
      projectId: withoutProject ? null : service.projectId,
    },
    (key, value) => (key === "updatedAt" ? undefined : value),
  );
}
