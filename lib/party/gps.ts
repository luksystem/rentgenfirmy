import { buildClientAddressLine } from "@/lib/dashboard/google-maps";

/** Wspólne pola adresu + GPS dla klienta / kontaktu. */
export type PartyLocationFields = {
  location: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  lat?: number | null;
  lng?: number | null;
  gpsManual?: boolean;
};

export type PartyGpsCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

export function formatPartyAddress(party: PartyLocationFields) {
  const structured = buildClientAddressLine(party);
  if (structured) {
    return structured;
  }
  return party.location?.trim() || "";
}

export function buildPartyGeocodeQueries(party: PartyLocationFields) {
  const queries = new Set<string>();
  const primary = buildClientAddressLine(party);

  if (primary) {
    queries.add(`${primary}, Polska`);
  }

  const location = party.location?.trim();
  if (location) {
    queries.add(`${location}, Polska`);
  }

  const cityLine = [party.addressPostalCode, party.addressCity].filter(Boolean).join(" ").trim();
  if (cityLine) {
    queries.add(`${cityLine}, Polska`);
  }

  return [...queries];
}

export function partyHasGeocodableAddress(party: PartyLocationFields) {
  return buildPartyGeocodeQueries(party).length > 0;
}

export function partyHasStoredGps(party: Pick<PartyLocationFields, "lat" | "lng">) {
  return (
    typeof party.lat === "number" &&
    Number.isFinite(party.lat) &&
    typeof party.lng === "number" &&
    Number.isFinite(party.lng)
  );
}

export function partyAddressFingerprint(party: PartyLocationFields) {
  return [party.location, party.addressStreet, party.addressCity, party.addressPostalCode]
    .map((value) => value.trim().toLowerCase())
    .join("|");
}

export function partyAddressChanged(
  previous: PartyLocationFields | null | undefined,
  next: PartyLocationFields,
) {
  if (!previous) {
    return true;
  }
  return partyAddressFingerprint(previous) !== partyAddressFingerprint(next);
}

export function parseOptionalCoordinate(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const number =
    typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

/**
 * Ustala lat/lng przy zapisie:
 * - gpsManual=true + obie współrzędne → zapis ręczny admina
 * - zmiana adresu lub brak GPS → geokodowanie
 * - inaczej zachowaj poprzednie
 */
export async function resolvePartyGpsOnSave(
  next: PartyLocationFields,
  previous: PartyLocationFields | null | undefined,
  geocode: (party: PartyLocationFields) => Promise<PartyGpsCoordinates | null>,
): Promise<{ lat: number | null; lng: number | null; gpsManual: boolean }> {
  if (next.gpsManual === true) {
    const lat = parseOptionalCoordinate(next.lat);
    const lng = parseOptionalCoordinate(next.lng);
    if (lat != null && lng != null) {
      return { lat, lng, gpsManual: true };
    }
    return { lat: null, lng: null, gpsManual: false };
  }

  const addressChanged = partyAddressChanged(previous, next);
  const missingGps = !partyHasStoredGps(previous ?? {});

  if (!addressChanged && !missingGps && previous) {
    return {
      lat: previous.lat ?? null,
      lng: previous.lng ?? null,
      gpsManual: Boolean(previous.gpsManual),
    };
  }

  if (!partyHasGeocodableAddress(next)) {
    return { lat: null, lng: null, gpsManual: false };
  }

  const result = await geocode(next);
  if (!result) {
    if (addressChanged) {
      return { lat: null, lng: null, gpsManual: false };
    }
    return {
      lat: previous?.lat ?? null,
      lng: previous?.lng ?? null,
      gpsManual: Boolean(previous?.gpsManual),
    };
  }

  return { lat: result.lat, lng: result.lng, gpsManual: false };
}
