import type { PartyGpsCoordinates, PartyLocationFields } from "@/lib/party/gps";
import { buildPartyGeocodeQueries } from "@/lib/party/gps";

async function geocodeQuery(query: string): Promise<PartyGpsCoordinates | null> {
  const response = await fetch(`/api/clients/geocode?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    result?: PartyGpsCoordinates | null;
  };

  return payload.result ?? null;
}

/** Geokodowanie adresu (bez cache sesji — wynik trafia do DB). */
export async function geocodePartyAddress(
  party: PartyLocationFields,
): Promise<PartyGpsCoordinates | null> {
  const queries = buildPartyGeocodeQueries(party);
  for (const query of queries) {
    const result = await geocodeQuery(query);
    if (result) {
      return result;
    }
  }
  return null;
}
