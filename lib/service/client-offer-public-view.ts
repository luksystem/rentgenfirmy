import { buildServiceReportCosts, isServiceSettled } from "@/lib/service/report-document";
import { emptyOfferApprovalState } from "@/lib/service/offer-approval";
import type { ServiceCostBreakdown, ServiceRecord } from "@/lib/service/types";

export type PublicOfferKind = "estimate" | "settlement";

/**
 * Widok serwisu do WEWNĘTRZNEGO użytku (snapshoty dokumentu akceptacji, work ordery —
 * patrz lib/work-order/defaults.ts, lib/service/client-offer-snapshot.ts). Zwraca pełny
 * ServiceRecord (stawki, ustawienia stref km itd.) — potrzebne do wygenerowania dokumentu
 * PDF/HTML po stronie serwera. NIE używać do budowania odpowiedzi publicznego API
 * (app/api/oferta/[token]/route.ts) — do tego służy `toPublicOfferPayload` poniżej, które
 * dodatkowo odcina pola nieprzeznaczone dla klienta.
 */
export function getPublicOfferView(service: ServiceRecord): ServiceRecord {
  if (isServiceSettled(service)) {
    return service;
  }

  return {
    ...service,
    status: "Wycena",
    actual: {
      ...service.estimate,
      billable: { ...service.estimate.billable },
    },
    actualDiscounts: { ...service.estimateDiscounts },
  };
}

export function getPublicSettlementView(service: ServiceRecord): ServiceRecord {
  return {
    ...service,
    status: "Rozliczony",
  };
}

const ZERO_RATES: ServiceRecord["rates"] = {
  supervisionHourly: 0,
  installerHourly: 0,
  helperHourly: 0,
  programmerHourly: 0,
  carPerKm: 0,
  carHourly: 0,
  accommodationCost: 0,
};

const ZERO_ZONE_SETTINGS: ServiceRecord["zoneSettings"] = {
  zone1ThresholdKm: 0,
  zone2ThresholdKm: 0,
  zone3ThresholdKm: 0,
};

const EMPTY_OFFER_STATE_FIELDS = {
  token: null,
  expiresAt: null,
  message: null,
  respondedAt: null,
  lastClientMessage: null,
  sentAt: null,
} as const;

export type PublicOfferCosts = {
  estimate: ServiceCostBreakdown;
  actual: ServiceCostBreakdown;
};

export type PublicOfferPayload = {
  service: ServiceRecord;
  costs: PublicOfferCosts;
};

/**
 * Buduje bezpieczną, biało-listowaną odpowiedź do publicznego, niezalogowanego
 * `/api/oferta/[token]` — wyliczone kwoty (`costs`) zamiast surowych stawek godzinowych, bez
 * historii akceptacji wewnętrznej (z ID pracowników), bez wyceny AI, bez tokenu/wiadomości
 * drugiej z ofert (klient patrzący na wycenę nie powinien dostać tokenu rozliczenia i odwrotnie).
 */
export function toPublicOfferPayload(
  service: ServiceRecord,
  kind: PublicOfferKind,
): PublicOfferPayload {
  const view = kind === "settlement" ? getPublicSettlementView(service) : getPublicOfferView(service);
  const costs = buildServiceReportCosts(view);

  const sanitized: ServiceRecord = {
    ...view,
    clientId: null,
    contactId: null,
    rates: ZERO_RATES,
    zoneSettings: ZERO_ZONE_SETTINGS,
    clientOffer: { ...EMPTY_OFFER_STATE_FIELDS, status: view.clientOffer.status },
    clientOfferHistory: [],
    clientOfferAcceptedDocument: null,
    settlementOffer: { ...EMPTY_OFFER_STATE_FIELDS, status: view.settlementOffer.status },
    settlementOfferHistory: [],
    settlementOfferAcceptedDocument: null,
    estimateApproval: emptyOfferApprovalState(),
    settlementApproval: emptyOfferApprovalState(),
    aiEstimate: null,
    intakeReference: null,
    reviewedAt: null,
  };

  return { service: sanitized, costs };
}
