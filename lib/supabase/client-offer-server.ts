import "server-only";

import {
  offerStatusAfterClientOfferAction,
  statusAfterClientOfferAction,
  type ClientOfferAction,
} from "@/lib/service/client-offer";
import { serviceStatusAfterSettlementAction } from "@/lib/service/settlement-offer";
import { appendClientOfferHistory } from "@/lib/service/client-offer-history";
import { appendSettlementOfferHistory } from "@/lib/service/client-offer-history";
import { getPublicOfferView, getPublicSettlementView } from "@/lib/service/client-offer-public-view";
import { buildAcceptedOfferDocument } from "@/lib/service/client-offer-snapshot";
import { applyClientOptionalSelection } from "@/lib/service/optional-items";
import type { ServiceRecord } from "@/lib/service/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import {
  clientToServiceClient,
  convertContactToClientServer,
} from "@/lib/supabase/contact-server";
import { isOfferExpiredService } from "@/lib/supabase/client-offer-repository";
import { createClientOfferAcceptedNotifications } from "@/lib/notifications/client-offer-accepted";
import { createWorkOrderFromAcceptedService, updateWorkOrderFromSettledService } from "@/lib/supabase/work-order-repository";

/**
 * Odpowiedź klienta na ofertę/rozliczenie (akceptacja/odrzucenie/negocjacja) — server-only, bo
 * dotyka getSupabaseServer (cookies) i wysyła powiadomienia push/e-mail (web-push, zależny od
 * Node `tls`). Nigdy nie importuj tego pliku z komponentu klienckiego ("use client") — patrz
 * lib/supabase/client-offer-repository.ts dla funkcji bezpiecznych po stronie przeglądarki.
 */

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

  // Rozliczenie nie wygasa — klient może odpowiedzieć zawsze, dopóki nie ma jeszcze decyzji
  // (po terminie automatycznej akceptacji i tak zostanie oznaczone jako zaakceptowane przez cron).

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
