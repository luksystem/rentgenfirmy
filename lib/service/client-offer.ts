import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";

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
  negotiate: "Chcę negocjować",
};

export function canGenerateClientOffer(service: ServiceRecord) {
  if (service.status === "Anulowany" || service.status === "Rozliczony") {
    return false;
  }

  return (
    service.status === "Wycena" ||
    service.status === "Oczekuje na klienta" ||
    service.clientOffer.status === "negotiation"
  );
}

export function canSendClientOffer(service: ServiceRecord) {
  return Boolean(service.clientOffer.token && service.clientOffer.status === "pending");
}

export function isClientOfferActive(offer: ClientOfferState) {
  if (!offer.token || !offer.expiresAt || offer.status !== "pending") {
    return false;
  }

  return new Date(offer.expiresAt).getTime() > Date.now();
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

export function defaultClientOfferExpiry(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
