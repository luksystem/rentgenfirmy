import type { Client } from "@/lib/service/types";
import {
  buildPartyGeocodeQueries,
  formatPartyAddress,
  partyHasGeocodableAddress,
  partyHasStoredGps,
  partyNeedsMapGeocode,
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

export function clientNeedsMapGeocode(client: Client) {
  return partyNeedsMapGeocode(client);
}

/**
 * Fingerprint adresów (bez lat/lng i bez wyniku lookupu) —
 * zapis GPS/fingerprint przy backfillu nie restartuje pętli w połowie.
 */
export function buildClientGeocodeFingerprint(clients: Client[]) {
  return clients
    .map((client) => `${client.id}:${buildClientGeocodeQueries(client).join("|")}`)
    .sort()
    .join("\n");
}
