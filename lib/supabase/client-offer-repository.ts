import {
  defaultClientOfferExpiry,
  offerStatusAfterClientOfferAction,
  statusAfterClientOfferAction,
  type ClientOfferAction,
} from "@/lib/service/client-offer";
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

  const updated: ServiceRecord = {
    ...service,
    status: "Oczekuje na klienta",
    updatedAt: new Date().toISOString(),
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
  const updated: ServiceRecord = {
    ...service,
    status: statusAfterClientOfferAction(action),
    updatedAt: now,
    clientOffer: {
      ...service.clientOffer,
      status: offerStatusAfterClientOfferAction(action),
      message: action === "negotiate" ? message?.trim() ?? null : null,
      respondedAt: now,
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

export function getPublicOfferView(service: ServiceRecord): ServiceRecord {
  return {
    ...service,
    status: "Wycena",
    actual: { ...service.estimate },
    actualDiscounts: { ...service.estimateDiscounts },
  };
}

export function isPublicOfferAvailable(service: ServiceRecord) {
  return (
    Boolean(service.clientOffer.token) &&
    service.clientOffer.status === "pending" &&
    !isOfferExpired(service)
  );
}
