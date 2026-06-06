import type { ServiceRecord } from "@/lib/service/types";

export function getPublicOfferView(service: ServiceRecord): ServiceRecord {
  return {
    ...service,
    status: "Wycena",
    actual: { ...service.estimate },
    actualDiscounts: { ...service.estimateDiscounts },
  };
}
