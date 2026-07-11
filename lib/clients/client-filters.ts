import { formatClientAddress } from "@/lib/clients/client-location";
import type { Client } from "@/lib/service/types";

export type ClientListFilters = {
  nameQuery: string;
  addressQuery: string;
};

export const EMPTY_CLIENT_LIST_FILTERS: ClientListFilters = {
  nameQuery: "",
  addressQuery: "",
};

export function countActiveClientListFilters(filters: ClientListFilters) {
  let count = 0;
  if (filters.nameQuery.trim()) count += 1;
  if (filters.addressQuery.trim()) count += 1;
  return count;
}

export function filterClients(clients: Client[], filters: ClientListFilters) {
  const nameQuery = filters.nameQuery.trim().toLowerCase();
  const addressQuery = filters.addressQuery.trim().toLowerCase();

  return clients.filter((client) => {
    if (nameQuery) {
      const nameHaystack = [client.firstName, client.lastName, client.externalId, client.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!nameHaystack.includes(nameQuery)) {
        return false;
      }
    }

    if (addressQuery) {
      const addressHaystack = [
        client.addressStreet,
        client.addressCity,
        client.addressPostalCode,
        client.location,
        formatClientAddress(client),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!addressHaystack.includes(addressQuery)) {
        return false;
      }
    }

    return true;
  });
}
