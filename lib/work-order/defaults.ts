import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { getPublicOfferView } from "@/lib/service/client-offer-public-view";
import { buildAcceptedOfferDocument } from "@/lib/service/client-offer-snapshot";
import type { ServiceRecord } from "@/lib/service/types";
import type { WorkOrderInput, WorkOrderRecord } from "@/lib/work-order/types";

export function resolveAcceptedAt(service: ServiceRecord) {
  return (
    service.clientOfferAcceptedDocument?.acceptedAt ??
    service.clientOffer.respondedAt ??
    new Date().toISOString()
  );
}

export function resolveAcceptedOfferDocument(
  service: ServiceRecord,
  acceptedAt: string,
) {
  if (service.clientOfferAcceptedDocument) {
    return service.clientOfferAcceptedDocument;
  }

  return buildAcceptedOfferDocument(getPublicOfferView(service), acceptedAt);
}

export function buildWorkOrderFromAcceptedService(
  service: ServiceRecord,
  acceptedAt: string,
): WorkOrderInput {
  const view = getPublicOfferView(service);
  const costs = calculateServiceCost(
    view.estimate,
    view.rates,
    view.zoneSettings,
    view.estimateDiscounts,
  );

  return {
    source: "accepted_offer",
    serviceId: service.id,
    projectId: service.projectId,
    clientId: service.clientId,
    status: "Nowe",
    title: service.title,
    serviceType: service.serviceType,
    client: { ...service.client },
    notes: "",
    acceptedAt,
    offerGrossTotal:
      service.clientOfferAcceptedDocument?.grossTotal ?? costs.grossTotal,
    acceptedOfferDocument: resolveAcceptedOfferDocument(service, acceptedAt),
  };
}

export function createEmptyWorkOrder(): WorkOrderRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    source: "manual",
    serviceId: null,
    projectId: null,
    clientId: null,
    status: "Nowe",
    title: "",
    serviceType: "Pogwarancyjny",
    client: {
      fullName: "",
      location: "",
      email: "",
      phone: "",
    },
    notes: "",
    acceptedAt: null,
    offerGrossTotal: null,
    acceptedOfferDocument: null,
    createdAt: now,
    updatedAt: now,
  };
}
