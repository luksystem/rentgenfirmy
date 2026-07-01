import type { TradeCatalogItem } from "@/lib/field-options";
import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";

export function formatTradeCatalogAddress(item: TradeCatalogItem) {
  return [item.addressStreet, item.addressPostalCode, item.addressCity]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function tradeCatalogGeocodeQueries(item: TradeCatalogItem) {
  const address = formatTradeCatalogAddress(item);
  const queries = [
    address ? `${address}, Polska` : "",
    item.company?.trim() ? `${item.company.trim()}, ${item.addressCity?.trim() || "Polska"}` : "",
    item.name?.trim() ? `${item.name.trim()}, ${item.addressCity?.trim() || "Polska"}` : "",
  ].filter(Boolean);

  return [...new Set(queries)];
}

export function hasTradeCatalogCoordinates(item: TradeCatalogItem) {
  return (
    typeof item.lat === "number" &&
    Number.isFinite(item.lat) &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lng)
  );
}

export function hasTradeCatalogGeocodableAddress(item: TradeCatalogItem) {
  return tradeCatalogGeocodeQueries(item).length > 0;
}

export function tradeCatalogItemToProjectTradeInput(item: TradeCatalogItem): ProjectTradeInput {
  return {
    name: item.name,
    company: item.company ?? "",
    contactName: item.contactName ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    description: item.description ?? "",
  };
}

export async function geocodeTradeCatalogItem(item: TradeCatalogItem) {
  for (const query of tradeCatalogGeocodeQueries(item)) {
    const response = await fetch(`/api/clients/geocode?q=${encodeURIComponent(query)}`, {
      credentials: "include",
    });
    if (!response.ok) {
      continue;
    }
    const payload = (await response.json()) as {
      result?: { lat: number; lng: number; label: string } | null;
    };
    if (payload.result) {
      return payload.result;
    }
  }
  return null;
}
