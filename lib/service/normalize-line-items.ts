import { normalizeServicePhotos } from "@/lib/service/service-photos";
import { emptyLineItems, type ServiceLineItems } from "@/lib/service/types";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export function normalizeLineItemsFromJson(value: unknown): ServiceLineItems {
  const data = asObject(value);

  return {
    accommodations: asNumber(data.accommodations),
    supervisionHours: asNumber(data.supervisionHours),
    programmerHours: asNumber(data.programmerHours),
    installerHours: asNumber(data.installerHours),
    helperHours: asNumber(data.helperHours),
    carHours: asNumber(data.carHours),
    kilometersOneWay: asNumber(data.kilometersOneWay),
    tripCount: Math.max(1, asNumber(data.tripCount, 1)),
    materialsCost: asNumber(data.materialsCost),
    materialsNote: typeof data.materialsNote === "string" ? data.materialsNote : "",
    workReportNote: typeof data.workReportNote === "string" ? data.workReportNote : "",
    photos: normalizeServicePhotos(data.photos),
    billable: normalizeBillable(data.billable),
  };
}
