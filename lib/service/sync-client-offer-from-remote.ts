import type { ServiceRecord } from "@/lib/service/types";

export function isWaitingForClientResponse(service: ServiceRecord) {
  if (service.status !== "Oczekuje na klienta") {
    return false;
  }
  const status = service.clientOffer.status;
  return status === "pending" || status === "negotiation";
}

export function mergeClientOfferFromRemote(
  local: ServiceRecord,
  remote: ServiceRecord,
): ServiceRecord {
  return {
    ...local,
    status: remote.status,
    clientOffer: remote.clientOffer,
    clientOfferHistory: remote.clientOfferHistory,
    clientOfferAcceptedDocument: remote.clientOfferAcceptedDocument,
    updatedAt: remote.updatedAt,
  };
}

export function hasRemoteClientOfferChanges(
  local: ServiceRecord,
  remote: ServiceRecord,
) {
  if (local.clientOffer.status !== remote.clientOffer.status) {
    return true;
  }

  if (local.clientOffer.message !== remote.clientOffer.message) {
    return true;
  }

  if (local.clientOffer.respondedAt !== remote.clientOffer.respondedAt) {
    return true;
  }

  if (local.clientOfferHistory.length !== remote.clientOfferHistory.length) {
    return true;
  }

  if (local.status !== remote.status) {
    return true;
  }

  if (
    local.clientOfferAcceptedDocument?.acceptedAt !==
    remote.clientOfferAcceptedDocument?.acceptedAt
  ) {
    return true;
  }

  return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime();
}
