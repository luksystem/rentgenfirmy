import { computeAiEstimateVariance } from "@/lib/service/ai-estimate-variance";
import type { ServiceRecord } from "@/lib/service/types";

export function finalizeAiEstimateOnSettle(service: ServiceRecord): ServiceRecord {
  if (!service.aiEstimate?.appliedLineItems) {
    return service;
  }

  const variance = computeAiEstimateVariance({
    estimateLineItems: service.aiEstimate.appliedLineItems,
    actualLineItems: service.actual,
    rates: service.rates,
    zoneSettings: service.zoneSettings,
    estimateDiscounts: service.estimateDiscounts,
    actualDiscounts: service.actualDiscounts,
  });

  return {
    ...service,
    aiEstimate: {
      ...service.aiEstimate,
      variance,
    },
  };
}
