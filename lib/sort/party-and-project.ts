import type { Contact } from "@/lib/contacts/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

const collator = new Intl.Collator("pl", { sensitivity: "base" });

export function sortClientsByLastName(clients: Client[]) {
  return [...clients].sort((a, b) => collator.compare(a.lastName, b.lastName));
}

export function sortContactsByLastName(contacts: Contact[]) {
  return [...contacts].sort((a, b) => collator.compare(a.lastName, b.lastName));
}

export function sortProjectsByName(projects: Project[]) {
  return [...projects].sort((a, b) => collator.compare(a.name, b.name));
}

export function projectsForClient(projects: Project[], clientId: string | null) {
  if (!clientId) {
    return [];
  }

  return sortProjectsByName(projects.filter((project) => project.clientId === clientId));
}

export function countProjectsForClient(projects: Project[], clientId: string) {
  return projects.filter((project) => project.clientId === clientId).length;
}
