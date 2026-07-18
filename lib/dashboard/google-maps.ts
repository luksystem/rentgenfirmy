import type { Client } from "@/lib/service/types";

export function buildClientAddressLine(client: Pick<
  Client,
  "addressStreet" | "addressCity" | "addressPostalCode" | "location"
>) {
  const street = client.addressStreet?.trim() || "";
  const cityLine = [client.addressPostalCode?.trim(), client.addressCity?.trim()]
    .filter(Boolean)
    .join(" ");
  const location = client.location?.trim() || "";
  const parts = [street, cityLine].filter(Boolean);

  if (parts.length) {
    const line = parts.join(", ");
    // Bez ulicy dołącz lokalizację (np. nazwa obiektu), żeby Maps nie celował tylko w miasto.
    if (!street && location && !line.toLowerCase().includes(location.toLowerCase())) {
      return `${location}, ${line}`;
    }
    return line;
  }

  return location;
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
