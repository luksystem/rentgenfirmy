import { resolveClientOfferExpiresAt, isOfferExpired } from "@/lib/service/offer-validity";
import { appendClientOfferHistory } from "@/lib/service/client-offer-history";
import { appendSettlementOfferHistory } from "@/lib/service/client-offer-history";
import { resetOptionalItemSelections } from "@/lib/service/optional-items";
import type { ServiceRecord } from "@/lib/service/types";
import { getSupabase } from "@/lib/supabase/client";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";
import { appendContactHistoryRecord } from "@/lib/supabase/contact-repository";

/**
 * Funkcje bezpieczne do importu z komponentów klienckich ("use client") — bez zależności
 * server-only (getSupabaseServer, powiadomienia push/e-mail przez lib/notifications/dispatch,
 * które ciągną web-push i jego zależność od Node `tls`). Obsługa odpowiedzi klienta
 * (respondToClientOffer/respondToSettlementOffer) i wysyłka powiadomień żyją w
 * lib/supabase/client-offer-server.ts — importuj je tylko z kodu server-only (route handlery,
 * server actions), żeby nie przeciekały do bundla przeglądarki.
 */

export function isOfferExpiredService(service: ServiceRecord) {
  return isOfferExpired(service.clientOffer.expiresAt);
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
  const preserveServiceStatus =
    service.status === "Rozliczony" || service.status === "Do rozliczenia";

  const updated: ServiceRecord = {
    ...service,
    status: preserveServiceStatus ? service.status : "Oczekuje na klienta",
    updatedAt: new Date().toISOString(),
    optionalItems: resetOptionalItemSelections(service.optionalItems),
    clientOfferHistory: appendClientOfferHistory(service.clientOfferHistory, {
      type: historyType,
      offerStatus: "pending",
    }),
    clientOffer: {
      token,
      expiresAt: resolveClientOfferExpiresAt(service.clientOffer.expiresAt),
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

  const saved = rowToService(data);

  if (service.contactId) {
    await appendContactHistoryRecord(
      service.contactId,
      "offer_linked",
      historyType === "link_regenerated"
        ? "Wygenerowano ponownie link oferty dla kontaktu."
        : "Wygenerowano link oferty dla kontaktu.",
      { serviceId: service.id },
    );
  }

  return saved;
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

export async function regenerateSettlementOfferForService(
  service: ServiceRecord,
): Promise<ServiceRecord> {
  const supabase = getSupabase();
  const token = crypto.randomUUID();
  const previousFeedback =
    service.settlementOffer.status === "negotiation" && service.settlementOffer.message
      ? service.settlementOffer.message
      : service.settlementOffer.lastClientMessage;
  const historyType = service.settlementOffer.token ? "link_regenerated" : "link_generated";

  const updated: ServiceRecord = {
    ...service,
    updatedAt: new Date().toISOString(),
    settlementOfferHistory: appendSettlementOfferHistory(service.settlementOfferHistory, {
      type: historyType,
      offerStatus: "pending",
    }),
    settlementOffer: {
      token,
      expiresAt: resolveClientOfferExpiresAt(service.settlementOffer.expiresAt),
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

export async function generateSettlementOfferForService(
  service: ServiceRecord,
): Promise<ServiceRecord> {
  if (service.settlementOffer.status === "accepted") {
    throw new Error("Nie można wygenerować nowego linku — rozliczenie zostało zaakceptowane.");
  }

  if (service.settlementOffer.token) {
    return regenerateSettlementOfferForService(service);
  }

  return regenerateSettlementOfferForService({
    ...service,
    settlementOffer: {
      ...service.settlementOffer,
      token: null,
    },
  });
}

export { getPublicOfferView, getPublicSettlementView } from "@/lib/service/client-offer-public-view";

export function isPublicOfferAvailable(service: ServiceRecord) {
  return (
    service.status === "Oczekuje na klienta" &&
    Boolean(service.clientOffer.token) &&
    service.clientOffer.status === "pending" &&
    !isOfferExpiredService(service)
  );
}

export function isPublicOfferQuestionAvailable(service: ServiceRecord) {
  return (
    service.status === "Oczekuje na klienta" &&
    Boolean(service.clientOffer.token) &&
    service.clientOffer.status === "pending" &&
    isOfferExpiredService(service)
  );
}

/** Rozliczenie nie wygasa — dostępne dopóki klient nie podjął jeszcze decyzji. */
export function isPublicSettlementOfferAvailable(service: ServiceRecord) {
  return Boolean(service.settlementOffer.token) && service.settlementOffer.status === "pending";
}

/** Rozliczenie nigdy nie „traci ważności” z perspektywy klienta — nie ma trybu pytania zamiast decyzji. */
export function isPublicSettlementOfferQuestionAvailable() {
  return false;
}
