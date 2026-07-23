import type { ClientOfferAction, ClientOfferStatus } from "@/lib/service/client-offer";
import { isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";

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

/**
 * Rozliczenie nie wygasa — link działa zawsze, dopóki klient nie odpowie. `expiresAt` to termin
 * automatycznej akceptacji (patrz `lib/notifications/settlement-auto-accept.ts`), nie ważność linku.
 */
export function isSettlementOfferActive(service: Pick<ServiceRecord, "settlementOffer">) {
  const { settlementOffer } = service;
  return Boolean(settlementOffer.token) && settlementOffer.status === "pending";
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

/**
 * Status usługi po odpowiedzi klienta na rozliczenie: akceptacja przechodzi do fakturowania,
 * odrzucenie/negocjacja wraca do "Rozliczony", żeby dało się poprawić i wysłać ponownie.
 */
export function serviceStatusAfterSettlementAction(action: ClientOfferAction): ServiceStatus {
  return action === "accept" ? "Fakturowanie" : "Rozliczony";
}
