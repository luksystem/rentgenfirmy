import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import type { ServiceRow, ServiceInsert } from "@/lib/supabase/database.types";
import {
  emptyLineItems,
  type ServiceDiscounts,
  type ServiceGlobalSettings,
  type ServiceLineItems,
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
    specialDiscountPln: asNumber(data.specialDiscountPln),
    vatRate: vat === 0 || vat === 8 || vat === 23 ? vat : 23,
  };
}

function normalizeBillable(value: unknown): ServiceLineItems["billable"] {
  const data = asObject(value);
  const defaults = emptyLineItems().billable;

  return {
    supervisionHours:
      data.supervisionHours === undefined
        ? defaults.supervisionHours
        : data.supervisionHours !== false,
    programmerHours:
      data.programmerHours === undefined
        ? defaults.programmerHours
        : data.programmerHours !== false,
    installerHours:
      data.installerHours === undefined ? defaults.installerHours : data.installerHours !== false,
    helperHours:
      data.helperHours === undefined ? defaults.helperHours : data.helperHours !== false,
    carHours: data.carHours === undefined ? defaults.carHours : data.carHours !== false,
    carKilometers:
      data.carKilometers === undefined ? defaults.carKilometers : data.carKilometers !== false,
    accommodations:
      data.accommodations === undefined ? defaults.accommodations : data.accommodations !== false,
    materials: data.materials === undefined ? defaults.materials : data.materials !== false,
  };
}

function normalizeLineItems(value: unknown): ServiceLineItems {
  const data = asObject(value);

  return {
    accommodations: asNumber(data.accommodations),
    supervisionHours: asNumber(data.supervisionHours),
    programmerHours: asNumber(data.programmerHours),
    installerHours: asNumber(data.installerHours),
    helperHours: asNumber(data.helperHours),
    carHours: asNumber(data.carHours),
    kilometersOneWay: asNumber(data.kilometersOneWay),
    materialsCost: asNumber(data.materialsCost),
    materialsNote: typeof data.materialsNote === "string" ? data.materialsNote : "",
    workReportNote: typeof data.workReportNote === "string" ? data.workReportNote : "",
    billable: normalizeBillable(data.billable),
  };
}

export function normalizeServiceGlobalSettings(value: unknown): ServiceGlobalSettings {
  const data = asObject(value);

  return {
    rates: normalizeRates(data.rates),
    zoneSettings: normalizeZoneSettings(data.zoneSettings),
    defaultDiscounts: normalizeDiscounts(data.defaultDiscounts ?? data),
  };
}

export function rowToService(row: ServiceRow): ServiceRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as ServiceRecord["status"],
    projectId: row.project_id,
    client: {
      fullName: row.client_full_name,
      location: row.client_location,
      email: row.client_email,
      phone: row.client_phone,
    },
    title: row.title,
    serviceType: row.service_type as ServiceRecord["serviceType"],
    rates: normalizeRates(row.rates),
    discounts: normalizeDiscounts(row.discounts),
    zoneSettings: normalizeZoneSettings(row.zone_settings),
    estimate: normalizeLineItems(row.estimate),
    actual: normalizeLineItems(row.actual),
  };
}

export function serviceToInsert(service: ServiceRecord): ServiceInsert {
  return {
    id: service.id,
    project_id: service.projectId,
    status: service.status,
    service_type: service.serviceType,
    title: service.title,
    client_full_name: service.client.fullName,
    client_location: service.client.location,
    client_email: service.client.email,
    client_phone: service.client.phone,
    rates: service.rates as Record<string, unknown>,
    discounts: service.discounts as Record<string, unknown>,
    zone_settings: service.zoneSettings as Record<string, unknown>,
    estimate: service.estimate as Record<string, unknown>,
    actual: service.actual as Record<string, unknown>,
    created_at: service.createdAt,
    updated_at: service.updatedAt,
  };
}
