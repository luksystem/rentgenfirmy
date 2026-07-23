import { appendSettlementOfferHistory } from "@/lib/service/client-offer-history";
import { getPublicSettlementView } from "@/lib/service/client-offer-public-view";
import { buildAcceptedOfferDocument } from "@/lib/service/client-offer-snapshot";
import type { ServiceRecord } from "@/lib/service/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { rowToService, serviceToInsert } from "@/lib/supabase/service-mappers";
import { updateWorkOrderFromSettledService } from "@/lib/supabase/work-order-repository";
import { createClientOfferAcceptedNotifications } from "@/lib/notifications/client-offer-accepted";

/**
 * Rozliczenia, którym minął termin automatycznej akceptacji (`settlement_offer_expires_at`) bez
 * reakcji klienta — link nigdy nie wygasa, ale brak odpowiedzi do terminu = uznajemy za
 * zaakceptowane i przechodzimy do fakturowania (patrz lib/service/settlement-offer.ts).
 */
async function fetchDueSettlements(now: Date): Promise<ServiceRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("settlement_offer_status", "pending")
    .not("settlement_offer_token", "is", null)
    .lte("settlement_offer_expires_at", now.toISOString());

  if (error) {
    if (error.message.toLowerCase().includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToService);
}

async function autoAcceptOne(service: ServiceRecord, nowIso: string): Promise<ServiceRecord> {
  const supabase = getSupabaseAdmin();
  const companyProfile = await resolveCompanyProfileDocumentServer().catch(() => undefined);

  const serviceForSave: ServiceRecord = {
    ...service,
    status: "Fakturowanie",
    updatedAt: nowIso,
    settlementOfferHistory: appendSettlementOfferHistory(service.settlementOfferHistory, {
      type: "auto_accepted",
      offerStatus: "accepted",
      at: nowIso,
    }),
    settlementOffer: {
      ...service.settlementOffer,
      status: "accepted",
      respondedAt: nowIso,
    },
  };

  const updated: ServiceRecord = {
    ...serviceForSave,
    settlementOfferAcceptedDocument: buildAcceptedOfferDocument(
      getPublicSettlementView(serviceForSave),
      nowIso,
      undefined,
      companyProfile,
    ),
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
  await updateWorkOrderFromSettledService(saved, nowIso);
  await createClientOfferAcceptedNotifications({
    serviceId: saved.id,
    clientName: saved.client.fullName,
    serviceTitle: saved.title,
    intakeReference: saved.intakeReference,
    kind: "settlement",
  }).catch(() => undefined);

  return saved;
}

export async function runSettlementAutoAccept(now = new Date()) {
  const nowIso = now.toISOString();
  const due = await fetchDueSettlements(now);
  let accepted = 0;
  let failed = 0;

  for (const service of due) {
    try {
      await autoAcceptOne(service, nowIso);
      accepted += 1;
    } catch (error) {
      failed += 1;
      console.warn("[settlement-auto-accept] failed:", service.id, error);
    }
  }

  return { scanned: due.length, accepted, failed };
}
