import type { Client } from "@/lib/service/types";

export function buildClientAddressLine(client: Pick<
  Client,
  "addressStreet" | "addressCity" | "addressPostalCode" | "location"
>) {
  const parts = [
    client.addressStreet?.trim(),
    [client.addressPostalCode?.trim(), client.addressCity?.trim()].filter(Boolean).join(" "),
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(", ");
  }

  return client.location?.trim() || "";
}

export function buildGoogleMapsSearchUrl(address: string) {
  const query = address.trim();
  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(address: string) {
  const query = address.trim();
  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrlFromCoords(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function getClientGoogleMapsUrl(client: Pick<
  Client,
  "addressStreet" | "addressCity" | "addressPostalCode" | "location"
>) {
  return buildGoogleMapsSearchUrl(buildClientAddressLine(client));
}
