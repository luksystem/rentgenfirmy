import {
  CLIENT_OFFER_STATUS_LABELS,
  type ClientOfferStatus,
} from "@/lib/service/client-offer";
import type { ServiceOfferListTone } from "@/lib/service/client-offer-history";
import { isPublicOfferAvailable } from "@/lib/supabase/client-offer-repository";
import { isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";

export type ClientOfferSummary = {
  id: string;
  title: string;
  serviceType: string;
  serviceStatus: ServiceStatus;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
  updatedAt: string;
  offerToken: string | null;
  offerStatus: ClientOfferStatus | null;
  offerStatusLabel: string | null;
  expiresAt: string | null;
  canRespond: boolean;
  isSettlement: boolean;
};

export function getClientOfferSummaryTone(summary: ClientOfferSummary): ServiceOfferListTone | null {
  if (summary.offerStatus === "accepted") {
    return "accepted";
  }
  if (summary.offerStatus === "rejected") {
    return "rejected";
  }
  if (summary.offerStatus === "negotiation") {
    return "negotiation";
  }
  if (summary.offerStatus === "pending") {
    return "pending";
  }
  if (summary.serviceStatus === "Wycena") {
    return "quote";
  }
  return null;
}

export function isClientOfferPendingAttention(summary: ClientOfferSummary) {
  return summary.canRespond && summary.offerStatus === "pending";
}

export function buildClientOfferSummary(
  service: ServiceRecord,
  projectNames: Map<string, string>,
): ClientOfferSummary {
  const offerStatus = service.clientOffer.status;
  return {
    id: service.id,
    title: service.title.trim() || "Oferta serwisowa",
    serviceType: service.serviceType,
    serviceStatus: service.status,
    projectId: service.projectId,
    projectName: service.projectId ? (projectNames.get(service.projectId) ?? null) : null,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    offerToken: service.clientOffer.token,
    offerStatus,
    offerStatusLabel: offerStatus ? CLIENT_OFFER_STATUS_LABELS[offerStatus] : null,
    expiresAt: service.clientOffer.expiresAt,
    canRespond: isPublicOfferAvailable(service),
    isSettlement: isServiceSettled(service) || service.status === "Do rozliczenia",
  };
}

export function buildClientOfferSummaries(
  services: ServiceRecord[],
  projectNames: Map<string, string>,
  options?: { projectId?: string; publicOnly?: boolean },
) {
  return services
    .filter((service) => {
      if (options?.projectId && service.projectId !== options.projectId) {
        return false;
      }
      if (options?.publicOnly && !service.clientOffer.token) {
        return false;
      }
      return true;
    })
    .map((service) => buildClientOfferSummary(service, projectNames))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function countPendingClientOffers(summaries: ClientOfferSummary[]) {
  return summaries.filter(isClientOfferPendingAttention).length;
}
