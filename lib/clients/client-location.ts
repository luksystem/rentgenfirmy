import type { Client } from "@/lib/service/types";

export function formatClientAddress(client: Client) {
  const cityLine = [client.addressPostalCode, client.addressCity].filter(Boolean).join(" ").trim();
  const parts = [client.addressStreet, cityLine, client.location].map((part) => part?.trim()).filter(Boolean);
  return parts.join(", ");
}

export function buildClientGeocodeQuery(client: Client) {
  const address = formatClientAddress(client);
  if (!address) {
    return "";
  }
  return `${address}, Polska`;
}

export function clientHasGeocodableAddress(client: Client) {
  return Boolean(buildClientGeocodeQuery(client));
}
