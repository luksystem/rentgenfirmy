import {
  offerStatusAfterClientOfferAction,
  statusAfterClientOfferAction,
  type ClientOfferAction,
} from "@/lib/service/client-offer";
import { serviceStatusAfterSettlementAction } from "@/lib/service/settlement-offer";
import { isOfferExpired, resolveClientOfferExpiresAt } from "@/lib/service/offer-validity";
import { appendClientOfferHistory } from "@/lib/service/client-offer-history";
import { appendSettlementOfferHistory } from "@/lib/service/client-offer-history";
import { getPublicOfferView, getPublicSettlementView } from "@/lib/service/client-offer-public-view";
import { buildAcceptedOfferDocument } from "@/lib/service/client-offer-snapshot";
import {
  applyClientOptionalSelection,
  resetOptionalItemSelections,
} from "@/lib/service/optional-items";
import type { ServiceRecord } from "@/lib/service/types";
import { getSupabase } from "@/lib/supabase/client";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { appendContactHistoryRecord } from "@/lib/supabase/contact-repository";
import {
  clientToServiceClient,
  convertContactToClientServer,
} from "@/lib/supabase/contact-server";
import { createClientOfferAcceptedNotifications } from "@/lib/notifications/client-offer-accepted";
import { createWorkOrderFromAcceptedService, updateWorkOrderFromSettledService } from "@/lib/supabase/work-order-repository";

function isOfferExpiredService(service: ServiceRecord) {
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
  selectedOptionalItemIds?: string[],
): Promise<ServiceRecord> {
  const supabase = getSupabaseServer();
  const service = await fetchServiceByClientOfferToken(token);

  if (!service) {
    throw new Error("Nie znaleziono oferty.");
  }

  if (action !== "negotiate" && isOfferExpiredService(service)) {
    throw new Error("Oferta straciła ważność — akceptacja i odrzucenie nie są już możliwe.");
  }

  if (service.clientOffer.status && service.clientOffer.status !== "pending") {
    throw new Error("Oferta ma już zapisaną decyzję klienta.");
  }

  if (action === "negotiate" && !message?.trim()) {
    throw new Error("Wiadomość jest wymagana przy negocjacji.");
  }

  const now = new Date().toISOString();
  const offerStatus = offerStatusAfterClientOfferAction(action);
  const clientMessage = message?.trim() || null;

  let serviceForSave: ServiceRecord = {
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
      lastClientMessage: clientMessage ?? service.clientOffer.lastClientMessage,
    },
  };

  if (action === "accept") {
    serviceForSave = applyClientOptionalSelection(
      serviceForSave,
      selectedOptionalItemIds ?? [],
    );

    if (service.contactId && !service.clientId) {
      const { client } = await convertContactToClientServer(service.contactId, {
        source: "offer_accepted",
        serviceId: service.id,
      });
      serviceForSave = {
        ...serviceForSave,
        clientId: client.id,
        client: clientToServiceClient(client),
      };
    }
  }

  const companyProfile =
    action === "accept" ? await resolveCompanyProfileDocumentServer() : null;

  const updated: ServiceRecord = {
    ...serviceForSave,
    clientOfferAcceptedDocument:
      action === "accept"
        ? buildAcceptedOfferDocument(
            getPublicOfferView(serviceForSave),
            now,
            undefined,
            companyProfile ?? undefined,
          )
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

  const saved = rowToService(data);

  if (action === "accept") {
    await createWorkOrderFromAcceptedService(saved, now);
    await createClientOfferAcceptedNotifications({
      serviceId: saved.id,
      clientName: saved.client.fullName,
      serviceTitle: saved.title,
      intakeReference: saved.intakeReference,
      kind: "estimate",
    }).catch(() => undefined);
  }

  return saved;
}

function isSettlementOfferExpiredService(service: ServiceRecord) {
  return isOfferExpired(service.settlementOffer.expiresAt);
}

export async function fetchServiceBySettlementOfferToken(
  token: string,
): Promise<ServiceRecord | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("settlement_offer_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? rowToService(data) : null;
}

export type PublicOfferLookup = {
  kind: "estimate" | "settlement";
  service: ServiceRecord;
};

export async function fetchServiceByPublicOfferToken(
  token: string,
): Promise<PublicOfferLookup | null> {
  const estimate = await fetchServiceByClientOfferToken(token);
  if (estimate) {
    return { kind: "estimate", service: estimate };
  }

  const settlement = await fetchServiceBySettlementOfferToken(token);
  if (settlement) {
    return { kind: "settlement", service: settlement };
  }

  return null;
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

export async function respondToSettlementOffer(
  token: string,
  action: ClientOfferAction,
  message?: string,
): Promise<ServiceRecord> {
  const supabase = getSupabaseServer();
  const service = await fetchServiceBySettlementOfferToken(token);

  if (!service) {
    throw new Error("Nie znaleziono rozliczenia.");
  }

  if (action !== "negotiate" && isSettlementOfferExpiredService(service)) {
    throw new Error("Rozliczenie straciło ważność — akceptacja i odrzucenie nie są już możliwe.");
  }

  if (service.settlementOffer.status && service.settlementOffer.status !== "pending") {
    throw new Error("Rozliczenie ma już zapisaną decyzję klienta.");
  }

  if (action === "negotiate" && !message?.trim()) {
    throw new Error("Wiadomość jest wymagana przy konsultacji.");
  }

  const now = new Date().toISOString();
  const offerStatus = offerStatusAfterClientOfferAction(action);
  const clientMessage = message?.trim() || null;

  const serviceForSave: ServiceRecord = {
    ...service,
    status: serviceStatusAfterSettlementAction(action),
    updatedAt: now,
    settlementOfferHistory: appendSettlementOfferHistory(service.settlementOfferHistory, {
      type: historyTypeForAction(action),
      message: clientMessage,
      offerStatus,
      at: now,
    }),
    settlementOffer: {
      ...service.settlementOffer,
      status: offerStatus,
      message: clientMessage,
      respondedAt: now,
      lastClientMessage: clientMessage ?? service.settlementOffer.lastClientMessage,
    },
  };

  const companyProfile =
    action === "accept" ? await resolveCompanyProfileDocumentServer() : null;

  const updated: ServiceRecord = {
    ...serviceForSave,
    settlementOfferAcceptedDocument:
      action === "accept"
        ? buildAcceptedOfferDocument(
            getPublicSettlementView(serviceForSave),
            now,
            undefined,
            companyProfile ?? undefined,
          )
        : service.settlementOfferAcceptedDocument,
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

  if (action === "accept") {
    await updateWorkOrderFromSettledService(saved, now);
    await createClientOfferAcceptedNotifications({
      serviceId: saved.id,
      clientName: saved.client.fullName,
      serviceTitle: saved.title,
      intakeReference: saved.intakeReference,
      kind: "settlement",
    }).catch(() => undefined);
  }

  return saved;
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

export function isPublicSettlementOfferAvailable(service: ServiceRecord) {
  return (
    Boolean(service.settlementOffer.token) &&
    service.settlementOffer.status === "pending" &&
    !isSettlementOfferExpiredService(service)
  );
}

export function isPublicSettlementOfferQuestionAvailable(service: ServiceRecord) {
  return (
    Boolean(service.settlementOffer.token) &&
    service.settlementOffer.status === "pending" &&
    isSettlementOfferExpiredService(service)
  );
}
