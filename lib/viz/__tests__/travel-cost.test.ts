import { describe, expect, it } from "vitest";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import type { ServiceLineItems } from "@/lib/service/types";
import { calculateVizTravelCost } from "@/lib/viz/travel-cost";

const rates = DEFAULT_SERVICE_SETTINGS.rates;
const zones = DEFAULT_SERVICE_SETTINGS.zoneSettings;

function referenceTravelCost(input: {
  kilometersOneWay: number;
  tripCount: number;
  carHours: number;
}) {
  const items: ServiceLineItems = {
    accommodations: 0,
    supervisionHours: 0,
    programmerHours: 0,
    installerHours: 0,
    helperHours: 0,
    carHours: input.carHours,
    kilometersOneWay: input.kilometersOneWay,
    tripCount: input.tripCount,
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

  const breakdown = calculateServiceCost(items, rates, zones, {
    percentDiscount: 0,
    materialsPercentDiscount: 0,
    specialDiscountPln: 0,
    vatRate: 0,
  });

  return {
    zone: breakdown.kilometerZone,
    suggestedCarHoursPerTrip: breakdown.suggestedCarHoursFromZone,
    carKmCost: breakdown.categories.car,
    carHoursCost: breakdown.categories.carHours,
    totalTravelCost: breakdown.categories.car + breakdown.categories.carHours,
  };
}

describe("calculateVizTravelCost", () => {
  it("matches Szybkie oferty travel calculation for local zone", () => {
    const input = { kilometersOneWay: 45, tripCount: 1, carHours: 0 };
    const viz = calculateVizTravelCost({ ...input, rates, zoneSettings: zones });
    const ref = referenceTravelCost(input);

    expect(viz.zone).toBe(ref.zone);
    expect(viz.suggestedCarHoursPerTrip).toBe(ref.suggestedCarHoursPerTrip);
    expect(viz.carKmCost).toBe(ref.carKmCost);
    expect(viz.carHoursCost).toBe(ref.carHoursCost);
    expect(viz.totalTravelCost).toBe(ref.totalTravelCost);
  });

  it("matches Szybkie oferty travel calculation for remote zone with multiple trips", () => {
    const input = { kilometersOneWay: 220, tripCount: 3, carHours: 6 };
    const viz = calculateVizTravelCost({ ...input, rates, zoneSettings: zones });
    const ref = referenceTravelCost(input);

    expect(viz.zone).toBe(ref.zone);
    expect(viz.carKmCost).toBe(ref.carKmCost);
    expect(viz.carHoursCost).toBe(ref.carHoursCost);
    expect(viz.totalTravelCost).toBe(ref.totalTravelCost);
  });

  it("uses default car hours from zone when carHours is zero", () => {
    const result = calculateVizTravelCost({
      kilometersOneWay: 150,
      tripCount: 2,
      carHours: 0,
      rates,
      zoneSettings: zones,
    });

    expect(result.zone).toBe(1);
    expect(result.suggestedCarHoursPerTrip).toBe(2);
    expect(result.carHoursCost).toBeGreaterThan(0);
  });
});
