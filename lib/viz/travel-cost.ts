import { resolveKilometerZone } from "@/lib/service/kilometer-zone";
import type { KilometerZoneSettings, ServiceLineItems, ServiceRates } from "@/lib/service/types";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";

export type VizTravelCostInput = {
  kilometersOneWay: number;
  tripCount?: number;
  carHours?: number;
  rates?: ServiceRates;
  zoneSettings?: KilometerZoneSettings;
};

export type VizTravelCostResult = {
  zone: 0 | 1 | 2 | 3;
  suggestedCarHoursPerTrip: number;
  carKmCost: number;
  carHoursCost: number;
  totalTravelCost: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildTravelLineItems(input: VizTravelCostInput): ServiceLineItems {
  return {
    accommodations: 0,
    supervisionHours: 0,
    programmerHours: 0,
    installerHours: 0,
    helperHours: 0,
    carHours: input.carHours ?? 0,
    kilometersOneWay: Math.max(0, input.kilometersOneWay),
    tripCount: Math.max(1, input.tripCount ?? 1),
    materialsCost: 0,
    materialItems: [],
    materialsNote: "",
    workReportNote: "",
    photos: [],
    billable: {
      supervisionHours: false,
      programmerHours: false,
      installerHours: false,
      helperHours: false,
      carHours: true,
      carKilometers: true,
      accommodations: false,
      materials: false,
    },
  };
}

/** Niezależny kalkulator kosztu dojazdu — ten sam algorytm co w Szybkich ofertach (tylko travel). */
export function calculateVizTravelCost(input: VizTravelCostInput): VizTravelCostResult {
  const rates = input.rates ?? DEFAULT_SERVICE_SETTINGS.rates;
  const zoneSettings = input.zoneSettings ?? DEFAULT_SERVICE_SETTINGS.zoneSettings;
  const items = buildTravelLineItems(input);

  const breakdown = calculateServiceCost(items, rates, zoneSettings, {
    percentDiscount: 0,
    materialsPercentDiscount: 0,
    specialDiscountPln: 0,
    vatRate: 0,
  });

  return {
    zone: breakdown.kilometerZone as 0 | 1 | 2 | 3,
    suggestedCarHoursPerTrip: breakdown.suggestedCarHoursFromZone,
    carKmCost: breakdown.categories.car,
    carHoursCost: breakdown.categories.carHours,
    totalTravelCost: roundMoney(breakdown.categories.car + breakdown.categories.carHours),
  };
}

export function resolveTravelZone(kilometersOneWay: number, zoneSettings?: KilometerZoneSettings) {
  return resolveKilometerZone(
    Math.max(0, kilometersOneWay),
    zoneSettings ?? DEFAULT_SERVICE_SETTINGS.zoneSettings,
  );
}
