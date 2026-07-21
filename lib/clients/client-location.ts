import type { Client } from "@/lib/service/types";
import {
  buildPartyGeocodeQueries,
  formatPartyAddress,
  partyHasGeocodableAddress,
  partyHasStoredGps,
} from "@/lib/party/gps";

export function formatClientAddress(client: Client) {
  return formatPartyAddress(client);
}

export function buildClientGeocodeQueries(client: Client) {
  return buildPartyGeocodeQueries(client);
}

export function buildClientGeocodeQuery(client: Client) {
  return buildClientGeocodeQueries(client)[0] ?? "";
}

export function clientHasGeocodableAddress(client: Client) {
  return partyHasGeocodableAddress(client) || partyHasStoredGps(client);
}

/**
 * Fingerprint adresów (bez lat/lng) — zapis GPS przy backfillu mapy nie restartuje pętli.
 */
export function buildClientGeocodeFingerprint(clients: Client[]) {
  return clients
    .map((client) => `${client.id}:${buildClientGeocodeQueries(client).join("|")}`)
    .sort()
    .join("\n");
}
