import type { Client } from "@/lib/service/types";
import { buildClientAddressLine } from "@/lib/dashboard/google-maps";

export function formatClientAddress(client: Client) {
  const structured = buildClientAddressLine(client);
  if (structured) {
    return structured;
  }
  return client.location?.trim() || "";
}

export function buildClientGeocodeQueries(client: Client) {
  const queries = new Set<string>();
  const primary = buildClientAddressLine(client);

  if (primary) {
    queries.add(`${primary}, Polska`);
  }

  const location = client.location?.trim();
  if (location) {
    queries.add(`${location}, Polska`);
  }

  const cityLine = [client.addressPostalCode, client.addressCity].filter(Boolean).join(" ").trim();
  if (cityLine) {
    queries.add(`${cityLine}, Polska`);
  }

  return [...queries];
}

export function buildClientGeocodeQuery(client: Client) {
  return buildClientGeocodeQueries(client)[0] ?? "";
}

export function clientHasGeocodableAddress(client: Client) {
  return buildClientGeocodeQueries(client).length > 0;
}

export function buildClientGeocodeFingerprint(clients: Client[]) {
  return clients
    .map((client) => `${client.id}:${buildClientGeocodeQueries(client).join("|")}`)
    .sort()
    .join("\n");
}
