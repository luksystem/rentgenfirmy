import type { KilometerZoneSettings } from "@/lib/service/types";

export function resolveKilometerZone(
  kilometersOneWay: number,
  zones: KilometerZoneSettings,
): 0 | 1 | 2 | 3 {
  const km = Math.max(0, kilometersOneWay);

  if (km >= zones.zone3ThresholdKm) {
    return 3;
  }

  if (km >= zones.zone2ThresholdKm) {
    return 2;
  }

  if (km >= zones.zone1ThresholdKm) {
    return 1;
  }

  return 0;
}
