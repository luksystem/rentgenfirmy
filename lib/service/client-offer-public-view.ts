import { isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord } from "@/lib/service/types";

export type PublicOfferKind = "estimate" | "settlement";

export function getPublicOfferView(service: ServiceRecord): ServiceRecord {
  if (isServiceSettled(service)) {
    return service;
  }

  return {
    ...service,
    status: "Wycena",
    actual: {
      ...service.estimate,
      billable: { ...service.estimate.billable },
    },
    actualDiscounts: { ...service.estimateDiscounts },
  };
}

export function getPublicSettlementView(service: ServiceRecord): ServiceRecord {
  return {
    ...service,
    status: "Rozliczony",
  };
}
