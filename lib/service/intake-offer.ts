import type { ServiceRecord } from "@/lib/service/types";

export function isUnreviewedIntakeOffer(
  service: Pick<ServiceRecord, "intakeReference" | "reviewedAt">,
) {
  return Boolean(service.intakeReference?.trim()) && !service.reviewedAt;
}

export function countUnreviewedIntakeOffers(services: ServiceRecord[]) {
  return services.filter(isUnreviewedIntakeOffer).length;
}
