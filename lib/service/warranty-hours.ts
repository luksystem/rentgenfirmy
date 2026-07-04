import type { ServiceLineItems, ServiceWarrantyHours } from "@/lib/service/types";

export const EMPTY_WARRANTY_HOURS: ServiceWarrantyHours = {
  supervisionHours: 0,
  programmerHours: 0,
  installerHours: 0,
  helperHours: 0,
  carHours: 0,
};

export function normalizeWarrantyHours(value: unknown): ServiceWarrantyHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const normalized: ServiceWarrantyHours = {
    supervisionHours: Math.max(0, Number(data.supervisionHours) || 0),
    programmerHours: Math.max(0, Number(data.programmerHours) || 0),
    installerHours: Math.max(0, Number(data.installerHours) || 0),
    helperHours: Math.max(0, Number(data.helperHours) || 0),
    carHours: Math.max(0, Number(data.carHours) || 0),
  };

  return hasWarrantyHours(normalized) ? normalized : null;
}

export function hasWarrantyHours(
  warrantyHours: ServiceWarrantyHours | null | undefined,
): warrantyHours is ServiceWarrantyHours {
  if (!warrantyHours) {
    return false;
  }

  return (
    warrantyHours.supervisionHours > 0 ||
    warrantyHours.programmerHours > 0 ||
    warrantyHours.installerHours > 0 ||
    warrantyHours.helperHours > 0 ||
    warrantyHours.carHours > 0
  );
}

export function resolveWarrantyHours(items: ServiceLineItems): ServiceWarrantyHours {
  return items.warrantyHours ?? EMPTY_WARRANTY_HOURS;
}

function subtractWarrantyHours(total: number, warranty: number): number {
  return Math.max(0, total - Math.max(0, warranty));
}

/** Godziny podlegające rozliczeniu (poza gwarancją). */
export function effectiveLineItemsForCost(items: ServiceLineItems): ServiceLineItems {
  const warranty = items.warrantyHours;
  if (!hasWarrantyHours(warranty)) {
    return items;
  }

  return {
    ...items,
    supervisionHours: subtractWarrantyHours(items.supervisionHours, warranty.supervisionHours),
    programmerHours: subtractWarrantyHours(items.programmerHours, warranty.programmerHours),
    installerHours: subtractWarrantyHours(items.installerHours, warranty.installerHours),
    helperHours: subtractWarrantyHours(items.helperHours, warranty.helperHours),
    carHours: subtractWarrantyHours(items.carHours, warranty.carHours),
  };
}

export function clampWarrantyHours(
  items: ServiceLineItems,
  warrantyHours: ServiceWarrantyHours,
): ServiceWarrantyHours {
  return {
    supervisionHours: Math.min(warrantyHours.supervisionHours, items.supervisionHours),
    programmerHours: Math.min(warrantyHours.programmerHours, items.programmerHours),
    installerHours: Math.min(warrantyHours.installerHours, items.installerHours),
    helperHours: Math.min(warrantyHours.helperHours, items.helperHours),
    carHours: Math.min(warrantyHours.carHours, items.carHours),
  };
}
