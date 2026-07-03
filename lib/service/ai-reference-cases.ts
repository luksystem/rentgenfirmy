import type { ServiceAiReferenceCase } from "@/lib/ai/service-estimate-generator";
import type { ServiceRecord } from "@/lib/service/types";

function sumLaborHours(items: ServiceRecord["estimate"]) {
  return (
    items.installerHours +
    items.helperHours +
    items.programmerHours +
    items.supervisionHours
  );
}

export function buildReferenceCasesFromServices(services: ServiceRecord[]): ServiceAiReferenceCase[] {
  return services
    .filter((service) => service.status === "Rozliczony")
    .slice(0, 10)
    .map((service) => {
      const estimateItems = service.aiEstimate?.appliedLineItems ?? service.estimate;
      const description =
        service.aiEstimate?.description?.trim() ||
        service.estimate.workReportNote?.trim() ||
        service.title;

      return {
        title: service.title,
        description,
        serviceType: service.serviceType,
        distanceKm: estimateItems.kilometersOneWay,
        estimateHours: Math.round(sumLaborHours(estimateItems) * 10) / 10,
        actualHours: Math.round(sumLaborHours(service.actual) * 10) / 10,
        netDeltaPercent: service.aiEstimate?.variance?.netDeltaPercent ?? 0,
      };
    })
    .filter((item) => item.description.trim().length > 0);
}
