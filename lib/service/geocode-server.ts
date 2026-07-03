export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export async function geocodeAddressServer(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("q", trimmed);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "RentgenFirmy/1.0 (service travel estimate)",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  const hit = payload[0];
  if (!hit) {
    return null;
  }

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name ?? trimmed,
  };
}

export function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
}
