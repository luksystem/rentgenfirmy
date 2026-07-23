import { HttpError } from "@/lib/auth/http-error";
import type { UserProfile } from "@/lib/auth/types";
import { isChannelEnabled, isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { buildOfferSendEmail } from "@/lib/email/service-offer-templates";
import { sendTransactionalEmail } from "@/lib/email/send";
import { renderPlainTemplateString } from "@/lib/notifications/dispatch";
import { sendSms } from "@/lib/sms/sendSms";
import { absoluteAppUrl } from "@/lib/messages/app-url";
import {
  appendClientOfferHistory,
  appendSettlementOfferHistory,
} from "@/lib/service/client-offer-history";
import { resolveClientOfferExpiresAt, isOfferExpired } from "@/lib/service/offer-validity";
import { canGenerateOrSendOffer, type OfferKind } from "@/lib/service/offer-approval";
import { getServiceCombinedBilling, isServiceSettled } from "@/lib/service/report-document";
import type { ServiceRecord, ServiceStatus } from "@/lib/service/types";
import { formatDate } from "@/lib/utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { resolveOfferApprovalAfterSendServer } from "@/lib/supabase/service-repository-server";
import { createOfferApprovalReviewedNotificationServer } from "@/lib/notifications/server";

async function fetchServiceOrThrow(serviceId: string): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new HttpError(404, "Nie znaleziono oferty.");
  }
  return rowToService(data);
}

function assertCanSend(
  service: ServiceRecord,
  kind: OfferKind,
  actingProfile: Pick<UserProfile, "id" | "role" | "offerApprovalBypass">,
) {
  const approval = kind === "estimate" ? service.estimateApproval : service.settlementApproval;
  if (!canGenerateOrSendOffer(approval, actingProfile)) {
    throw new HttpError(403, "Wymagana akceptacja administratora przed wysyłką do klienta.");
  }
}

function assertOfferAllowedForKind(service: ServiceRecord, kind: OfferKind) {
  if (kind === "estimate") {
    if (service.clientOffer.status === "accepted") {
      throw new HttpError(400, "Klient już zaakceptował ofertę.");
    }
    return;
  }

  if (service.pricingModel !== "hourly") {
    throw new HttpError(400, "Link rozliczenia jest dostępny tylko dla ofert wg stawek godzinowych.");
  }
  if (!isServiceSettled(service)) {
    throw new HttpError(400, "Najpierw rozlicz ofertę przed wysyłką rozliczenia.");
  }
  if (service.settlementOffer.status === "accepted") {
    throw new HttpError(400, "Klient już zaakceptował rozliczenie.");
  }
}

/** Generuje (lub odświeża, jeśli wygasł) token publicznego linku bez zmiany innych pól. */
async function ensureOfferToken(service: ServiceRecord, kind: OfferKind): Promise<ServiceRecord> {
  const offer = kind === "estimate" ? service.clientOffer : service.settlementOffer;
  if (offer.token && offer.status === "pending" && !isOfferExpired(offer.expiresAt)) {
    return service;
  }

  const supabase = getSupabaseAdmin();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const previousFeedback =
    offer.status === "negotiation" && offer.message ? offer.message : offer.lastClientMessage;
  const historyType = offer.token ? "link_regenerated" : "link_generated";

  const nextOffer = {
    token,
    expiresAt: resolveClientOfferExpiresAt(offer.expiresAt),
    status: "pending" as const,
    message: null,
    respondedAt: null,
    lastClientMessage: previousFeedback,
  };

  const updated: ServiceRecord =
    kind === "estimate"
      ? {
          ...service,
          updatedAt: now,
          status: service.status === "Rozliczony" || service.status === "Do rozliczenia"
            ? service.status
            : "Oczekuje na klienta",
          clientOffer: nextOffer,
          clientOfferHistory: appendClientOfferHistory(service.clientOfferHistory, {
            type: historyType,
            offerStatus: "pending",
          }),
        }
      : {
          ...service,
          updatedAt: now,
          settlementOffer: nextOffer,
          settlementOfferHistory: appendSettlementOfferHistory(service.settlementOfferHistory, {
            type: historyType,
            offerStatus: "pending",
          }),
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

function offerPublicUrl(service: ServiceRecord, kind: OfferKind) {
  const token = kind === "estimate" ? service.clientOffer.token : service.settlementOffer.token;
  return absoluteAppUrl(`/oferta/${token}`);
}

async function buildEmailForService(service: ServiceRecord, kind: OfferKind) {
  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer().catch(() => null),
  ]);

  let grossTotal: number | null = null;
  try {
    grossTotal = getServiceCombinedBilling(service).grossTotal;
  } catch {
    grossTotal = null;
  }

  const expiresAt = kind === "estimate" ? service.clientOffer.expiresAt : service.settlementOffer.expiresAt;

  const email = buildOfferSendEmail({
    clientName: service.client.fullName,
    offerTitle: service.title,
    offerUrl: offerPublicUrl(service, kind),
    expiresAtLabel: expiresAt ? formatDate(expiresAt) : null,
    grossTotal,
    kind,
    brand: settings.brand,
    company,
  });

  return { ...email, to: service.client.email.trim() };
}

export async function previewOfferEmailServer(input: {
  serviceId: string;
  kind: OfferKind;
  actingProfile: Pick<UserProfile, "id" | "role" | "offerApprovalBypass">;
}) {
  const service = await fetchServiceOrThrow(input.serviceId);
  assertOfferAllowedForKind(service, input.kind);
  assertCanSend(service, input.kind, input.actingProfile);

  const withToken = await ensureOfferToken(service, input.kind);
  const email = await buildEmailForService(withToken, input.kind);

  return { ...email, service: withToken };
}

const STATUS_AFTER_SETTLEMENT_SEND: ServiceStatus = "Rozliczanie";

export async function sendOfferEmailServer(input: {
  serviceId: string;
  kind: OfferKind;
  actingProfile: Pick<UserProfile, "id" | "role" | "offerApprovalBypass">;
}) {
  const service = await fetchServiceOrThrow(input.serviceId);
  assertOfferAllowedForKind(service, input.kind);
  assertCanSend(service, input.kind, input.actingProfile);

  const withToken = await ensureOfferToken(service, input.kind);
  const settings = await fetchEmailSettingsServer();
  const emailEnabled = isEmailAudienceEnabled(settings.routing, "client_offer_sent", "client");
  const smsEnabled = isChannelEnabled(settings.routing, "client_offer_sent", "sms");

  let result: { skipped?: boolean } = {};
  if (emailEnabled) {
    if (!withToken.client.email.trim()) {
      throw new HttpError(400, "Brak adresu e-mail klienta.");
    }
    const email = await buildEmailForService(withToken, input.kind);
    result = await sendTransactionalEmail({ to: email.to, subject: email.subject, html: email.html });
  }

  if (smsEnabled && withToken.client.phone.trim()) {
    try {
      const template = settings.templates.client_offer_sent;
      const message = renderPlainTemplateString(template.sms, {
        kind_label: input.kind === "settlement" ? "rozliczenie" : "wycenę",
        offer_title: withToken.title,
        offer_url: offerPublicUrl(withToken, input.kind),
      });
      if (message) {
        await sendSms({ phone: withToken.client.phone.trim(), message, metadata: { type: "client_offer_sent" } });
      }
    } catch (smsError) {
      console.warn("[client-offer-sent] sms failed:", smsError);
    }
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const statusUpdate =
    input.kind === "settlement" ? { status: STATUS_AFTER_SETTLEMENT_SEND } : {};

  const { data, error } = await supabase
    .from("services")
    .update({ ...statusUpdate, updated_at: now })
    .eq("id", input.serviceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  const saved = rowToService(data);

  const { notifyRequestedBy } = await resolveOfferApprovalAfterSendServer(
    saved,
    input.kind,
    input.actingProfile.id,
  );

  if (notifyRequestedBy) {
    await createOfferApprovalReviewedNotificationServer({
      serviceId: saved.id,
      kind: input.kind,
      requestedById: notifyRequestedBy,
      serviceTitle: saved.title,
      outcome: "sent",
    }).catch(() => undefined);
  }

  const final = await fetchServiceOrThrow(saved.id);
  return { service: final, emailSkipped: result.skipped };
}
