import type { ClientOfferStatus } from "@/lib/service/client-offer";
import { isOfferExpired } from "@/lib/service/offer-validity";
import { isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord } from "@/lib/service/types";

export function canGenerateSettlementOffer(service: ServiceRecord) {
  return (
    service.pricingModel === "hourly" &&
    isServiceSettled(service) &&
    service.settlementOffer.status !== "accepted"
  );
}

export function getSettlementOfferGenerateBlockReason(service: ServiceRecord) {
  if (service.pricingModel !== "hourly") {
    return "Link rozliczenia jest dostępny tylko dla ofert według stawek godzinowych.";
  }

  if (!isServiceSettled(service)) {
    return "Najpierw rozlicz ofertę — link rozliczenia można wygenerować po statusie „Rozliczony”.";
  }

  if (service.settlementOffer.status === "accepted") {
    return "Klient zaakceptował rozliczenie — nowy link nie może zastąpić zaakceptowanej wersji.";
  }

  return null;
}

export function canSendSettlementOffer(service: ServiceRecord) {
  return Boolean(service.settlementOffer.token && service.settlementOffer.status === "pending");
}

export function isSettlementOfferActive(service: Pick<ServiceRecord, "settlementOffer">) {
  const { settlementOffer } = service;

  if (!settlementOffer.token || !settlementOffer.expiresAt || settlementOffer.status !== "pending") {
    return false;
  }

  return !isOfferExpired(settlementOffer.expiresAt);
}

export function canClientAskAboutSettlementOffer(service: Pick<ServiceRecord, "settlementOffer">) {
  const { settlementOffer } = service;

  return (
    Boolean(settlementOffer.token) &&
    settlementOffer.status === "pending" &&
    isOfferExpired(settlementOffer.expiresAt)
  );
}

export function getSettlementOfferUrl(token: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/oferta/${token}`;
}

export function settlementStatusAfterClientAction(
  action: "accept" | "reject" | "negotiate",
): ClientOfferStatus {
  return action === "accept" ? "accepted" : action === "reject" ? "rejected" : "negotiation";
}
