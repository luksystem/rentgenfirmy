import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";
import {
  DEFAULT_OFFER_VALIDITY_DAYS,
  defaultClientOfferExpiry,
  isOfferExpired,
} from "@/lib/service/offer-validity";

export const CLIENT_OFFER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "negotiation",
] as const;

export type ClientOfferStatus = (typeof CLIENT_OFFER_STATUSES)[number];

export type ClientOfferState = {
  token: string | null;
  expiresAt: string | null;
  status: ClientOfferStatus | null;
  message: string | null;
  respondedAt: string | null;
};

export type ClientOfferAction = "accept" | "reject" | "negotiate";

export const CLIENT_OFFER_STATUS_LABELS: Record<ClientOfferStatus, string> = {
  pending: "Oczekuje na decyzję klienta",
  accepted: "Zaakceptowana przez klienta",
  rejected: "Odrzucona przez klienta",
  negotiation: "Negocjacja — wiadomość od klienta",
};

export const CLIENT_OFFER_ACTION_LABELS: Record<ClientOfferAction, string> = {
  accept: "Akceptuję ofertę",
  reject: "Odrzucam ofertę",
  negotiate: "Potrzebuję konsultacji",
};

export function canGenerateClientOffer(service: ServiceRecord) {
  return service.clientOffer.status !== "accepted";
}

export function getClientOfferGenerateBlockReason(service: ServiceRecord) {
  if (canGenerateClientOffer(service)) {
    return null;
  }

  return "Klient zaakceptował ofertę. Nowy link nie może zastąpić zaakceptowanej wersji — otwórz zapisany dokument zaakceptowanej wyceny (PDF).";
}

export function canSendClientOffer(service: ServiceRecord) {
  return Boolean(service.clientOffer.token && service.clientOffer.status === "pending");
}

export function isClientOfferActive(offer: ClientOfferState) {
  if (!offer.token || !offer.expiresAt || offer.status !== "pending") {
    return false;
  }

  return !isOfferExpired(offer.expiresAt);
}

export function canClientAskAboutOffer(service: Pick<ServiceRecord, "clientOffer">) {
  const { clientOffer } = service;

  return (
    Boolean(clientOffer.token) &&
    clientOffer.status === "pending" &&
    isOfferExpired(clientOffer.expiresAt)
  );
}

export function getClientOfferUrl(token: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/oferta/${token}`;
}

export function statusAfterClientOfferAction(action: ClientOfferAction): ServiceStatus {
  switch (action) {
    case "accept":
      return "Zaplanowany";
    case "reject":
      return "Anulowany";
    case "negotiate":
      return "Oczekuje na klienta";
  }
}

export function offerStatusAfterClientOfferAction(
  action: ClientOfferAction,
): ClientOfferStatus {
  return action === "accept" ? "accepted" : action === "reject" ? "rejected" : "negotiation";
}

