import type { Client } from "@/lib/service/types";
import { buildClientGeocodeQuery } from "@/lib/clients/client-location";

export type ClientMapCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

const memoryCache = new Map<string, ClientMapCoordinates | null>();
const STORAGE_KEY = "rentgen-client-geocode-v1";

function readStorageCache(): Record<string, ClientMapCoordinates | null> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ClientMapCoordinates | null>) : {};
  } catch {
    return {};
  }
}

function writeStorageCache(entry: Record<string, ClientMapCoordinates | null>) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

function cacheKey(client: Client) {
  return `${client.id}:${buildClientGeocodeQuery(client)}`;
}

function getCached(client: Client) {
  const key = cacheKey(client);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }
  const stored = readStorageCache()[key];
  if (stored !== undefined) {
    memoryCache.set(key, stored);
    return stored;
  }
  return undefined;
}

function setCached(client: Client, value: ClientMapCoordinates | null) {
  const key = cacheKey(client);
  memoryCache.set(key, value);
  const stored = readStorageCache();
  stored[key] = value;
  writeStorageCache(stored);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeQuery(query: string): Promise<ClientMapCoordinates | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pl");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "RentgenFirmy/1.0 (client map)",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const hit = payload[0];
  if (!hit) {
    return null;
  }

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name ?? query,
  };
}

export function isClientGeocodeCached(client: Client) {
  return getCached(client) !== undefined;
}

export async function geocodeClient(client: Client): Promise<ClientMapCoordinates | null> {
  const query = buildClientGeocodeQuery(client);
  if (!query) {
    return null;
  }

  const cached = getCached(client);
  if (cached !== undefined) {
    return cached;
  }

  const result = await geocodeQuery(query);
  setCached(client, result);
  return result;
}

export async function geocodeClientsBatch(
  clients: Client[],
  onProgress?: (done: number, total: number) => void,
) {
  const results = new Map<string, ClientMapCoordinates>();
  let done = 0;

  for (const client of clients) {
    const coords = await geocodeClient(client);
    if (coords) {
      results.set(client.id, coords);
    }
    done += 1;
    onProgress?.(done, clients.length);
    await wait(1100);
  }

  return results;
}
