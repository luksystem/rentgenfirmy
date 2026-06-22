import type { Client } from "@/lib/service/types";
import { buildClientGeocodeQueries } from "@/lib/clients/client-location";

export type ClientMapCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

const memoryCache = new Map<string, ClientMapCoordinates>();
const STORAGE_KEY = "rentgen-client-geocode-v2";
const REQUEST_GAP_MS = 1200;

function readStorageCache(): Record<string, ClientMapCoordinates> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ClientMapCoordinates>) : {};
  } catch {
    return {};
  }
}

function writeStorageCache(entry: Record<string, ClientMapCoordinates>) {
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
  return `${client.id}:${buildClientGeocodeQueries(client).join("|")}`;
}

function getCached(client: Client) {
  const key = cacheKey(client);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }
  const stored = readStorageCache()[key];
  if (stored) {
    memoryCache.set(key, stored);
    return stored;
  }
  return null;
}

function setCached(client: Client, value: ClientMapCoordinates) {
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
  const response = await fetch(`/api/clients/geocode?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    result?: ClientMapCoordinates | null;
    error?: string;
  };

  return payload.result ?? null;
}

export function isClientGeocodeCached(client: Client) {
  return getCached(client) !== null;
}

export async function geocodeClient(client: Client): Promise<ClientMapCoordinates | null> {
  const cached = getCached(client);
  if (cached) {
    return cached;
  }

  const queries = buildClientGeocodeQueries(client);
  if (!queries.length) {
    return null;
  }

  for (const query of queries) {
    const result = await geocodeQuery(query);
    if (result) {
      setCached(client, result);
      return result;
    }
    await wait(REQUEST_GAP_MS);
  }

  return null;
}

export async function geocodeClientsSequential(
  clients: Client[],
  onProgress?: (
    client: Client,
    done: number,
    total: number,
    coords: ClientMapCoordinates | null,
  ) => void,
) {
  const results = new Map<string, ClientMapCoordinates>();
  let done = 0;
  let lastNetworkAt = 0;

  for (const client of clients) {
    const cached = getCached(client);
    if (cached) {
      results.set(client.id, cached);
      done += 1;
      onProgress?.(client, done, clients.length, cached);
      continue;
    }

    const queries = buildClientGeocodeQueries(client);
    let coords: ClientMapCoordinates | null = null;

    for (const query of queries) {
      const elapsed = Date.now() - lastNetworkAt;
      if (lastNetworkAt > 0 && elapsed < REQUEST_GAP_MS) {
        await wait(REQUEST_GAP_MS - elapsed);
      }

      lastNetworkAt = Date.now();
      coords = await geocodeQuery(query);
      if (coords) {
        setCached(client, coords);
        break;
      }
    }

    if (coords) {
      results.set(client.id, coords);
    }

    done += 1;
    onProgress?.(client, done, clients.length, coords);
  }

  return results;
}
