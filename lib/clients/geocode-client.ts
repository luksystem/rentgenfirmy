import type { Client } from "@/lib/service/types";
import { buildClientGeocodeQueries } from "@/lib/clients/client-location";
import { partyHasStoredGps } from "@/lib/party/gps";

export type ClientMapCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

const REQUEST_GAP_MS = 1200;

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
  };

  return payload.result ?? null;
}

export function coordsFromStoredClient(client: Client): ClientMapCoordinates | null {
  if (!partyHasStoredGps(client)) {
    return null;
  }
  return {
    lat: client.lat as number,
    lng: client.lng as number,
    label: client.location || `${client.lat}, ${client.lng}`,
  };
}

export function isClientGeocodeCached(client: Client) {
  return partyHasStoredGps(client);
}

export async function geocodeClient(client: Client): Promise<ClientMapCoordinates | null> {
  const stored = coordsFromStoredClient(client);
  if (stored) {
    return stored;
  }

  const queries = buildClientGeocodeQueries(client);
  if (!queries.length) {
    return null;
  }

  for (const query of queries) {
    const result = await geocodeQuery(query);
    if (result) {
      return result;
    }
    await wait(REQUEST_GAP_MS);
  }

  return null;
}

/**
 * Preferuje zapisane GPS z DB. Geokoduje tylko brakujące i wywołuje onResolved
 * (np. żeby zapisać wynik z powrotem do klienta).
 */
export async function geocodeClientsSequential(
  clients: Client[],
  onProgress?: (
    client: Client,
    done: number,
    total: number,
    coords: ClientMapCoordinates | null,
  ) => void,
  onResolved?: (client: Client, coords: ClientMapCoordinates) => void | Promise<void>,
) {
  const results = new Map<string, ClientMapCoordinates>();
  let done = 0;
  let lastNetworkAt = 0;

  for (const client of clients) {
    const stored = coordsFromStoredClient(client);
    if (stored) {
      results.set(client.id, stored);
      done += 1;
      onProgress?.(client, done, clients.length, stored);
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
        break;
      }
    }

    if (coords) {
      results.set(client.id, coords);
      await onResolved?.(client, coords);
    }

    done += 1;
    onProgress?.(client, done, clients.length, coords);
  }

  return results;
}
