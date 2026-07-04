import { buildClientGeocodeQueries } from "@/lib/clients/client-location";
import { formatClientAddress } from "@/lib/clients/client-location";
import type { Client } from "@/lib/service/types";
import type {
  ServiceAiTravelContext,
  ServiceAiTravelProposal,
} from "@/lib/service/ai-estimate-types";
import { geocodeAddressServer, haversineDistanceKm } from "@/lib/service/geocode-server";
import type { KilometerZoneSettings } from "@/lib/service/types";

function estimateDriveTimeHours(oneWayKm: number) {
  const averageSpeedKmH = 70;
  return Math.round((oneWayKm / averageSpeedKmH) * 2 * 10) / 10;
}

function estimateWorkDaysFromTasks(totalOnsiteHours: number) {
  if (totalOnsiteHours <= 8) {
    return 1;
  }
  return Math.ceil(totalOnsiteHours / 8);
}

export function resolveOvernights(
  oneWayKm: number,
  zoneSettings: KilometerZoneSettings,
  estimatedWorkDays: number,
  aiTravel: ServiceAiTravelProposal,
) {
  const km = Math.max(0, oneWayKm);
  const multiDayOvernights = estimatedWorkDays > 1 ? estimatedWorkDays - 1 : 0;

  // Strefa lokalna (poniżej progu zone1) — codzienny dojazd, bez noclegów.
  if (km < zoneSettings.zone1ThresholdKm) {
    return 0;
  }

  // Bardzo daleko — nocleg praktycznie wymagany przy wyjazdach wielodniowych.
  if (km >= zoneSettings.zone3ThresholdKm || aiTravel.overnightRequired) {
    return Math.max(1, multiDayOvernights);
  }

  // Strefa pośrednia — nocleg tylko przy pracach trwających > 1 dzień roboczy.
  return multiDayOvernights;
}

export async function buildServiceTravelContext(input: {
  companyAddress: string;
  client: Client | null;
  clientLocationFallback: string;
  zoneSettings: KilometerZoneSettings;
  aiTravel: ServiceAiTravelProposal;
  totalOnsiteHours: number;
}): Promise<ServiceAiTravelContext> {
  const clientAddress =
    (input.client ? formatClientAddress(input.client) : "") ||
    input.clientLocationFallback.trim() ||
    "—";

  const companyAddress = input.companyAddress.trim() || "—";
  let oneWayDistanceKm = Math.max(0, input.aiTravel.oneWayDistanceKm);
  let geocoded = false;
  let geocodeNote: string | null = null;

  if (input.client && companyAddress !== "—") {
    const clientQueries = buildClientGeocodeQueries(input.client);
    const companyHit = await geocodeAddressServer(`${companyAddress}, Polska`);

    for (const query of clientQueries) {
      const clientHit = await geocodeAddressServer(query);
      if (companyHit && clientHit) {
        oneWayDistanceKm = haversineDistanceKm(companyHit, clientHit);
        geocoded = true;
        geocodeNote = `Odległość wyliczona z adresu firmy i klienta (${clientHit.label}).`;
        break;
      }
    }

    if (!geocoded) {
      geocodeNote =
        "Nie udało się geokodować adresu — użyto dystansu z propozycji AI lub ręcznego wpisu.";
    }
  } else if (companyAddress === "—") {
    geocodeNote = "Uzupełnij adres firmy w ustawieniach, aby liczyć dojazd automatycznie.";
  } else if (!input.client) {
    geocodeNote = "Przypisz klienta do oferty, aby wyliczyć odległość od bazy firmy.";
  }

  const estimatedWorkDays = estimateWorkDaysFromTasks(input.totalOnsiteHours);
  const resolvedOvernights = resolveOvernights(
    oneWayDistanceKm,
    input.zoneSettings,
    estimatedWorkDays,
    input.aiTravel,
  );
  const resolvedTrips =
    oneWayDistanceKm < input.zoneSettings.zone1ThresholdKm && estimatedWorkDays > 1
      ? estimatedWorkDays
      : Math.max(1, input.aiTravel.estimatedTrips || estimatedWorkDays);
  const totalDistanceKm = oneWayDistanceKm * 2 * resolvedTrips;

  return {
    companyAddress,
    clientAddress,
    oneWayDistanceKm,
    totalDistanceKm,
    estimatedDriveTimeHours: estimateDriveTimeHours(oneWayDistanceKm),
    resolvedOvernights,
    resolvedTrips,
    geocoded,
    geocodeNote,
  };
}
