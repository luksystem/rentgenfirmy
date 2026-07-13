import { formatClientAddress } from "@/lib/clients/client-location";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

export type ClientProjectFilter = "all" | "with_project" | "without_project";

export const CLIENT_PROJECT_FILTER_OPTIONS: Array<{
  value: ClientProjectFilter;
  label: string;
}> = [
  { value: "all", label: "Wszyscy" },
  { value: "with_project", label: "Z przypisanym projektem" },
  { value: "without_project", label: "Bez projektu" },
];

export type ClientListFilters = {
  nameQuery: string;
  addressQuery: string;
  projectFilter: ClientProjectFilter;
};

export const EMPTY_CLIENT_LIST_FILTERS: ClientListFilters = {
  nameQuery: "",
  addressQuery: "",
  projectFilter: "all",
};

export function buildClientIdsWithProject(projects: Project[]) {
  const ids = new Set<string>();
  for (const project of projects) {
    if (project.clientId) {
      ids.add(project.clientId);
    }
  }
  return ids;
}

export function countActiveClientListFilters(filters: ClientListFilters) {
  let count = 0;
  if (filters.nameQuery.trim()) count += 1;
  if (filters.addressQuery.trim()) count += 1;
  if (filters.projectFilter !== "all") count += 1;
  return count;
}

export function filterClients(
  clients: Client[],
  filters: ClientListFilters,
  projects: Project[] = [],
) {
  const nameQuery = filters.nameQuery.trim().toLowerCase();
  const addressQuery = filters.addressQuery.trim().toLowerCase();
  const clientIdsWithProject = buildClientIdsWithProject(projects);

  return clients.filter((client) => {
    if (filters.projectFilter === "with_project" && !clientIdsWithProject.has(client.id)) {
      return false;
    }
    if (filters.projectFilter === "without_project" && clientIdsWithProject.has(client.id)) {
      return false;
    }

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
