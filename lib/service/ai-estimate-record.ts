import { parseServiceAiEstimateProposal } from "@/lib/service/ai-estimate-normalize";
import type { ServiceAiEstimateRecord } from "@/lib/service/ai-estimate-types";
import type { ServiceCostBreakdown } from "@/lib/service/types";
import { normalizeLineItemsFromJson } from "@/lib/service/normalize-line-items";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeTravelContext(value: unknown): ServiceAiEstimateRecord["travelContext"] {
  const data = asObject(value);
  return {
    companyAddress: typeof data.companyAddress === "string" ? data.companyAddress : "",
    clientAddress: typeof data.clientAddress === "string" ? data.clientAddress : "",
    oneWayDistanceKm: Number(data.oneWayDistanceKm) || 0,
    totalDistanceKm: Number(data.totalDistanceKm) || 0,
    estimatedDriveTimeHours: Number(data.estimatedDriveTimeHours) || 0,
    resolvedOvernights: Number(data.resolvedOvernights) || 0,
    resolvedTrips: Math.max(1, Number(data.resolvedTrips) || 1),
    geocoded: data.geocoded === true,
    geocodeNote: typeof data.geocodeNote === "string" ? data.geocodeNote : null,
  };
}

function normalizeVariance(value: unknown): ServiceAiEstimateRecord["variance"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (typeof data.computedAt !== "string") {
    return null;
  }

  const estimateHours = asObject(data.estimateHours);
  const actualHours = asObject(data.actualHours);

  return {
    computedAt: data.computedAt,
    estimateHours: {
      installer: Number(estimateHours.installer) || 0,
      helper: Number(estimateHours.helper) || 0,
      programmer: Number(estimateHours.programmer) || 0,
      supervision: Number(estimateHours.supervision) || 0,
      trips: Number(estimateHours.trips) || 0,
      accommodations: Number(estimateHours.accommodations) || 0,
    },
    actualHours: {
      installer: Number(actualHours.installer) || 0,
      helper: Number(actualHours.helper) || 0,
      programmer: Number(actualHours.programmer) || 0,
      supervision: Number(actualHours.supervision) || 0,
      trips: Number(actualHours.trips) || 0,
      accommodations: Number(actualHours.accommodations) || 0,
    },
    estimateNetTotal: Number(data.estimateNetTotal) || 0,
    actualNetTotal: Number(data.actualNetTotal) || 0,
    netDelta: Number(data.netDelta) || 0,
    netDeltaPercent: Number(data.netDeltaPercent) || 0,
    summary: typeof data.summary === "string" ? data.summary : "",
  };
}

function normalizeCostBreakdown(value: unknown): ServiceCostBreakdown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const categories = asObject(data.categories);

  return {
    kilometerZone: Number(data.kilometerZone) || 0,
    suggestedCarHoursFromZone: Number(data.suggestedCarHoursFromZone) || 0,
    categories: {
      car: Number(categories.car) || 0,
      carHours: Number(categories.carHours) || 0,
      labor: Number(categories.labor) || 0,
      materials: Number(categories.materials) || 0,
      accommodations: Number(categories.accommodations) || 0,
    },
    subtotalBeforeDiscount: Number(data.subtotalBeforeDiscount) || 0,
    percentDiscountAmount: Number(data.percentDiscountAmount) || 0,
    materialsPercentDiscountAmount: Number(data.materialsPercentDiscountAmount) || 0,
    totalDiscountAmount: Number(data.totalDiscountAmount) || 0,
    totalDiscountPercentOfSubtotal: Number(data.totalDiscountPercentOfSubtotal) || 0,
    netTotal: Number(data.netTotal) || 0,
    vatAmount: Number(data.vatAmount) || 0,
    grossTotal: Number(data.grossTotal) || 0,
  };
}

export function normalizeServiceAiEstimateRecord(value: unknown): ServiceAiEstimateRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  if (typeof data.createdAt !== "string" || typeof data.description !== "string") {
    return null;
  }

  try {
    const proposal = parseServiceAiEstimateProposal(data.proposal);
    return {
      createdAt: data.createdAt,
      description: data.description,
      proposal,
      travelContext: normalizeTravelContext(data.travelContext),
      appliedAt: typeof data.appliedAt === "string" ? data.appliedAt : null,
      appliedLineItems:
        data.appliedLineItems != null
          ? normalizeLineItemsFromJson(data.appliedLineItems)
          : null,
      calculatedCosts: normalizeCostBreakdown(data.calculatedCosts),
      variance: normalizeVariance(data.variance),
    };
  } catch {
    return null;
  }
}

export function serializeServiceAiEstimateRecord(record: ServiceAiEstimateRecord): Record<string, unknown> {
  return {
    createdAt: record.createdAt,
    description: record.description,
    proposal: record.proposal,
    travelContext: record.travelContext,
    appliedAt: record.appliedAt,
    appliedLineItems: record.appliedLineItems,
    calculatedCosts: record.calculatedCosts,
    variance: record.variance,
  };
}
