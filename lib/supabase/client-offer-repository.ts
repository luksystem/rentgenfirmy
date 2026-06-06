import {
  defaultClientOfferExpiry,
  offerStatusAfterClientOfferAction,
  statusAfterClientOfferAction,
  type ClientOfferAction,
} from "@/lib/service/client-offer";
import { appendClientOfferHistory } from "@/lib/service/client-offer-history";
import { getPublicOfferView } from "@/lib/service/client-offer-public-view";
import { buildAcceptedOfferDocument } from "@/lib/service/client-offer-snapshot";
import type { ServiceRecord } from "@/lib/service/types";
import { getSupabase } from "@/lib/supabase/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";

function isOfferExpired(service: ServiceRecord) {
  if (!service.clientOffer.expiresAt) {
    return true;
  }

  return new Date(service.clientOffer.expiresAt).getTime() <= Date.now();
}

export async function regenerateClientOfferForService(
  service: ServiceRecord,
): Promise<ServiceRecord> {
  const supabase = getSupabase();
  const token = crypto.randomUUID();
  const previousFeedback =
    service.clientOffer.status === "negotiation" && service.clientOffer.message
      ? service.clientOffer.message
      : service.clientOffer.lastClientMessage;
  const historyType = service.clientOffer.token ? "link_regenerated" : "link_generated";

  const updated: ServiceRecord = {
    ...service,
    status: "Oczekuje na klienta",
    updatedAt: new Date().toISOString(),
    clientOfferHistory: appendClientOfferHistory(service.clientOfferHistory, {
      type: historyType,
      offerStatus: "pending",
    }),
    clientOffer: {
      token,
      expiresAt: defaultClientOfferExpiry(),
      status: "pending",
      message: null,
      respondedAt: null,
      lastClientMessage: previousFeedback,
    },
  };

  const { data, error } = await supabase
    .from("services")
    .upsert(serviceToInsert(updated), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToService(data);
}

export async function generateClientOfferForService(
  service: ServiceRecord,
): Promise<ServiceRecord> {
  if (service.clientOffer.status === "accepted") {
    throw new Error("Nie można wygenerować nowego linku — oferta została zaakceptowana.");
  }

  if (service.clientOffer.token) {
    return regenerateClientOfferForService(service);
  }

  return regenerateClientOfferForService({
    ...service,
    clientOffer: {
      ...service.clientOffer,
      token: null,
    },
  });
}

export async function fetchServiceByClientOfferToken(
  token: string,
): Promise<ServiceRecord | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("client_offer_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToService(data) : null;
}

function historyTypeForAction(action: ClientOfferAction) {
  switch (action) {
    case "accept":
      return "client_accepted" as const;
    case "reject":
      return "client_rejected" as const;
    case "negotiate":
      return "client_negotiation" as const;
  }
}

export async function respondToClientOffer(
  token: string,
  action: ClientOfferAction,
  message?: string,
): Promise<ServiceRecord> {
  const supabase = getSupabaseServer();
  const service = await fetchServiceByClientOfferToken(token);

  if (!service) {
    throw new Error("Nie znaleziono oferty.");
  }

  if (isOfferExpired(service)) {
    throw new Error("Link do oferty wygasł.");
  }

  if (service.clientOffer.status && service.clientOffer.status !== "pending") {
    throw new Error("Oferta ma już zapisaną decyzję klienta.");
  }

  if (action === "negotiate" && !message?.trim()) {
    throw new Error("Wiadomość jest wymagana przy negocjacji.");
  }

  const now = new Date().toISOString();
  const offerStatus = offerStatusAfterClientOfferAction(action);
  const clientMessage = action === "negotiate" ? message?.trim() ?? null : null;

  const updated: ServiceRecord = {
    ...service,
    status: statusAfterClientOfferAction(action),
    updatedAt: now,
    clientOfferHistory: appendClientOfferHistory(service.clientOfferHistory, {
      type: historyTypeForAction(action),
      message: clientMessage,
      offerStatus,
      at: now,
    }),
    clientOffer: {
      ...service.clientOffer,
      status: offerStatus,
      message: clientMessage,
      respondedAt: now,
      lastClientMessage:
        action === "negotiate" ? clientMessage : service.clientOffer.lastClientMessage,
    },
    clientOfferAcceptedDocument:
      action === "accept"
        ? buildAcceptedOfferDocument(getPublicOfferView(service), now)
        : service.clientOfferAcceptedDocument,
  };

  const { data, error } = await supabase
    .from("services")
    .upsert(serviceToInsert(updated), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToService(data);
}

export { getPublicOfferView } from "@/lib/service/client-offer-public-view";

export function isPublicOfferAvailable(service: ServiceRecord) {
  return (
    Boolean(service.clientOffer.token) &&
    service.clientOffer.status === "pending" &&
    !isOfferExpired(service)
  );
}
