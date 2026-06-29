import { resolveKilometerZone } from "@/lib/service/kilometer-zone";
import type {
  CostCategoryKey,
  KilometerZoneSettings,
  ServiceCostBreakdown,
  ServiceDiscounts,
  ServiceLineItems,
  ServiceRates,
} from "@/lib/service/types";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function travelCosts(
  items: ServiceLineItems,
  rates: ServiceRates,
  zones: KilometerZoneSettings,
) {
  const zone = resolveKilometerZone(items.kilometersOneWay, zones);
  const suggestedCarHoursFromZone = zone * 2;
  const trips = Math.max(1, items.tripCount || 1);

  let car = 0;
  if (items.billable.carKilometers) {
    car = items.kilometersOneWay * 2 * rates.carPerKm * trips;
  }

  let carHours = 0;
  if (items.billable.carHours) {
    const hoursPerTrip =
      items.carHours > 0 ? items.carHours : suggestedCarHoursFromZone;
    carHours = hoursPerTrip * rates.carHourly * trips;
  }

  return { car: roundMoney(car), carHours: roundMoney(carHours), zone, suggestedCarHoursFromZone };
}

function laborCost(items: ServiceLineItems, rates: ServiceRates) {
  let total = 0;

  if (items.billable.supervisionHours) {
    total += items.supervisionHours * rates.supervisionHourly;
  }

  if (items.billable.programmerHours) {
    total += items.programmerHours * rates.programmerHourly;
  }

  if (items.billable.installerHours) {
    total += items.installerHours * rates.installerHourly;
  }

  if (items.billable.helperHours) {
    total += items.helperHours * rates.helperHourly;
  }

  return roundMoney(total);
}

function accommodationsCost(items: ServiceLineItems, rates: ServiceRates) {
  if (!items.billable.accommodations) {
    return 0;
  }

  return roundMoney(items.accommodations * rates.accommodationCost);
}

function materialsCost(items: ServiceLineItems) {
  if (!items.billable.materials) {
    return 0;
  }

  return roundMoney(items.materialsCost);
}

export function calculateServiceCost(
  items: ServiceLineItems,
  rates: ServiceRates,
  zones: KilometerZoneSettings,
  discounts: ServiceDiscounts,
): ServiceCostBreakdown {
  const travel = travelCosts(items, rates, zones);

  const categories: Record<CostCategoryKey, number> = {
    car: travel.car,
    carHours: travel.carHours,
    labor: laborCost(items, rates),
    materials: materialsCost(items),
    accommodations: accommodationsCost(items, rates),
  };

  const subtotalBeforeDiscount = roundMoney(
    categories.car +
      categories.carHours +
      categories.labor +
      categories.materials +
      categories.accommodations,
  );

  const nonMaterialsSubtotal = roundMoney(
    categories.car + categories.carHours + categories.labor + categories.accommodations,
  );
  const materialsSubtotal = categories.materials;

  const percentDiscountAmount = roundMoney(
    (nonMaterialsSubtotal * Math.max(0, discounts.percentDiscount)) / 100,
  );
  const materialsPercentDiscountAmount = roundMoney(
    (materialsSubtotal * Math.max(0, discounts.materialsPercentDiscount)) / 100,
  );
  const totalDiscountAmount = roundMoney(
    percentDiscountAmount + materialsPercentDiscountAmount + Math.max(0, discounts.specialDiscountPln),
  );
  const totalDiscountPercentOfSubtotal =
    subtotalBeforeDiscount > 0
      ? roundMoney((totalDiscountAmount / subtotalBeforeDiscount) * 100)
      : 0;

  const netTotal = roundMoney(Math.max(0, subtotalBeforeDiscount - totalDiscountAmount));

  const vatAmount = roundMoney((netTotal * discounts.vatRate) / 100);
  const grossTotal = roundMoney(netTotal + vatAmount);

  return {
    kilometerZone: travel.zone,
    suggestedCarHoursFromZone: travel.suggestedCarHoursFromZone,
    categories,
    subtotalBeforeDiscount,
    percentDiscountAmount,
    materialsPercentDiscountAmount,
    totalDiscountAmount,
    totalDiscountPercentOfSubtotal,
    netTotal,
    vatAmount,
    grossTotal,
  };
}

export function hasBillableLineItem(items: ServiceLineItems) {
  const { billable } = items;

  return (
    (billable.supervisionHours && items.supervisionHours > 0) ||
    (billable.programmerHours && items.programmerHours > 0) ||
    (billable.installerHours && items.installerHours > 0) ||
    (billable.helperHours && items.helperHours > 0) ||
    (billable.carHours &&
      (items.carHours > 0 || items.kilometersOneWay > 0 || items.tripCount > 1)) ||
    (billable.carKilometers && (items.kilometersOneWay > 0 || items.tripCount > 1)) ||
    (billable.accommodations && items.accommodations > 0) ||
    (billable.materials && items.materialsCost > 0)
  );
}
