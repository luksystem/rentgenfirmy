import { hasBillableLineItem } from "@/lib/service/calculate-service-cost";
import type { ServiceRecord } from "@/lib/service/types";

export function isActualPristine(service: ServiceRecord) {
  return (
    !hasBillableLineItem(service.actual) &&
    !service.actual.workReportNote.trim() &&
    !service.actual.materialsNote.trim()
  );
}

export function copyEstimateToActual(service: ServiceRecord): ServiceRecord {
  return {
    ...service,
    actual: {
      ...service.estimate,
      billable: { ...service.estimate.billable },
    },
    actualDiscounts: { ...service.estimateDiscounts },
  };
}

export function prepareServiceForActualStep(service: ServiceRecord) {
  if (!isActualPristine(service)) {
    return service;
  }

  return copyEstimateToActual(service);
}
