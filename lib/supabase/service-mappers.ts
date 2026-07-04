import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import {
  CLIENT_OFFER_STATUSES,
  type ClientOfferStatus,
} from "@/lib/service/client-offer";
import { normalizeClientOfferHistory } from "@/lib/service/client-offer-history";
import { normalizeClientOfferAcceptedDocument } from "@/lib/service/client-offer-snapshot";
import { normalizeOptionalItems } from "@/lib/service/optional-items";
import { normalizeLineItemsFromJson } from "@/lib/service/normalize-line-items";
import {
  normalizeServiceAiEstimateRecord,
  serializeServiceAiEstimateRecord,
} from "@/lib/service/ai-estimate-record";
import type { ServiceRow, ServiceInsert } from "@/lib/supabase/database.types";
import {
  type ServiceDiscounts,
  type ServiceGlobalSettings,
  type ServiceRates,
  type KilometerZoneSettings,
  type ServiceRecord,
} from "@/lib/service/types";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRates(value: unknown): ServiceRates {
  const data = asObject(value);

  return {
    supervisionHourly: asNumber(data.supervisionHourly, DEFAULT_SERVICE_SETTINGS.rates.supervisionHourly),
    installerHourly: asNumber(data.installerHourly, DEFAULT_SERVICE_SETTINGS.rates.installerHourly),
    helperHourly: asNumber(data.helperHourly, DEFAULT_SERVICE_SETTINGS.rates.helperHourly),
    programmerHourly: asNumber(data.programmerHourly, DEFAULT_SERVICE_SETTINGS.rates.programmerHourly),
    carPerKm: asNumber(data.carPerKm, DEFAULT_SERVICE_SETTINGS.rates.carPerKm),
    carHourly: asNumber(data.carHourly, DEFAULT_SERVICE_SETTINGS.rates.carHourly),
    accommodationCost: asNumber(
      data.accommodationCost,
      DEFAULT_SERVICE_SETTINGS.rates.accommodationCost,
    ),
  };
}

function normalizeZoneSettings(value: unknown): KilometerZoneSettings {
  const data = asObject(value);

  return {
    zone1ThresholdKm: asNumber(
      data.zone1ThresholdKm,
      DEFAULT_SERVICE_SETTINGS.zoneSettings.zone1ThresholdKm,
    ),
    zone2ThresholdKm: asNumber(
      data.zone2ThresholdKm,
      DEFAULT_SERVICE_SETTINGS.zoneSettings.zone2ThresholdKm,
    ),
    zone3ThresholdKm: asNumber(
      data.zone3ThresholdKm,
      DEFAULT_SERVICE_SETTINGS.zoneSettings.zone3ThresholdKm,
    ),
  };
}

function normalizeDiscounts(value: unknown): ServiceDiscounts {
  const data = asObject(value);
  const vat = asNumber(data.vatRate, DEFAULT_SERVICE_SETTINGS.defaultDiscounts.vatRate);

  return {
    percentDiscount: asNumber(data.percentDiscount),
    materialsPercentDiscount: asNumber(data.materialsPercentDiscount),
    specialDiscountPln: asNumber(data.specialDiscountPln),
    vatRate: vat === 0 || vat === 8 || vat === 23 ? vat : 23,
  };
}

function normalizeIntakeSettings(value: unknown): import("@/lib/service/types").ServiceIntakeSettings {
  const data = asObject(value);

  return {
    prioritySurchargePercent: asNumber(
      data.prioritySurchargePercent,
      DEFAULT_SERVICE_SETTINGS.intakeSettings.prioritySurchargePercent,
    ),
  };
}

function normalizeAiEstimateSettings(
  value: unknown,
): import("@/lib/service/types").ServiceAiEstimateSettings {
  const data = asObject(value);
  const defaults = DEFAULT_SERVICE_SETTINGS.aiEstimateSettings;

  const systemPrompt =
    typeof data.systemPrompt === "string"
      ? data.systemPrompt
      : defaults.systemPrompt;
  const rulesPrompt =
    typeof data.rulesPrompt === "string" ? data.rulesPrompt : defaults.rulesPrompt;
  const newContactRulesPrompt =
    typeof data.newContactRulesPrompt === "string"
      ? data.newContactRulesPrompt
      : defaults.newContactRulesPrompt;

  return {
    systemPrompt,
    rulesPrompt,
    newContactRulesPrompt,
  };
}

export function normalizeServiceGlobalSettings(value: unknown): ServiceGlobalSettings {
  const data = asObject(value);

  return {
    rates: normalizeRates(data.rates),
    zoneSettings: normalizeZoneSettings(data.zoneSettings),
    defaultDiscounts: normalizeDiscounts(data.defaultDiscounts ?? data),
    intakeSettings: normalizeIntakeSettings(data.intakeSettings),
    aiEstimateSettings: normalizeAiEstimateSettings(data.aiEstimateSettings),
  };
}

function normalizeClientOfferStatus(value: unknown): ClientOfferStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return CLIENT_OFFER_STATUSES.includes(value as ClientOfferStatus)
    ? (value as ClientOfferStatus)
    : null;
}

function normalizeClientOffer(row: ServiceRow): ServiceRecord["clientOffer"] {
  return {
    token: row.client_offer_token ?? null,
    expiresAt: row.client_offer_expires_at ?? null,
    status: normalizeClientOfferStatus(row.client_offer_status),
    message: row.client_offer_message ?? null,
    respondedAt: row.client_offer_responded_at ?? null,
    lastClientMessage: row.client_offer_last_client_message ?? null,
  };
}

export function rowToService(row: ServiceRow): ServiceRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as ServiceRecord["status"],
    projectId: row.project_id,
    clientId: row.client_id,
    contactId: row.contact_id ?? null,
    client: {
      fullName: row.client_full_name,
      location: row.client_location,
      email: row.client_email,
      phone: row.client_phone,
    },
    title: row.title,
    serviceType: row.service_type as ServiceRecord["serviceType"],
    rates: normalizeRates(row.rates),
    estimateDiscounts: normalizeDiscounts(row.estimate_discounts ?? row.discounts),
    actualDiscounts: normalizeDiscounts(row.actual_discounts ?? row.discounts),
    zoneSettings: normalizeZoneSettings(row.zone_settings),
    detailedSettlement: row.detailed_settlement ?? false,
    showEstimateComparison: row.show_estimate_comparison ?? true,
    estimate: normalizeLineItemsFromJson(row.estimate),
    actual: normalizeLineItemsFromJson(row.actual),
    aiEstimate: normalizeServiceAiEstimateRecord(row.ai_estimate),
    optionalItems: normalizeOptionalItems(row.optional_items),
    clientOffer: normalizeClientOffer(row),
    clientOfferHistory: normalizeClientOfferHistory(row.client_offer_history),
    clientOfferAcceptedDocument: normalizeClientOfferAcceptedDocument(
      row.client_offer_accepted_document,
    ),
    intakeReference: row.intake_reference ?? null,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export function serviceToInsert(service: ServiceRecord): ServiceInsert {
  return {
    id: service.id,
    project_id: service.projectId,
    client_id: service.clientId,
    contact_id: service.contactId,
    status: service.status,
    service_type: service.serviceType,
    title: service.title,
    client_full_name: service.client.fullName,
    client_location: service.client.location,
    client_email: service.client.email,
    client_phone: service.client.phone,
    rates: service.rates as Record<string, unknown>,
    discounts: service.estimateDiscounts as Record<string, unknown>,
    estimate_discounts: service.estimateDiscounts as Record<string, unknown>,
    actual_discounts: service.actualDiscounts as Record<string, unknown>,
    zone_settings: service.zoneSettings as Record<string, unknown>,
    detailed_settlement: service.detailedSettlement,
    show_estimate_comparison: service.showEstimateComparison,
    estimate: service.estimate as Record<string, unknown>,
    actual: service.actual as Record<string, unknown>,
    optional_items: service.optionalItems as Record<string, unknown>[],
    client_offer_token: service.clientOffer.token,
    client_offer_expires_at: service.clientOffer.expiresAt,
    client_offer_status: service.clientOffer.status,
    client_offer_message: service.clientOffer.message,
    client_offer_responded_at: service.clientOffer.respondedAt,
    client_offer_last_client_message: service.clientOffer.lastClientMessage,
    client_offer_history: service.clientOfferHistory,
    client_offer_accepted_document: service.clientOfferAcceptedDocument,
    ai_estimate: service.aiEstimate ? serializeServiceAiEstimateRecord(service.aiEstimate) : null,
    intake_reference: service.intakeReference,
    reviewed_at: service.reviewedAt,
    created_at: service.createdAt,
    updated_at: service.updatedAt,
  };
}
