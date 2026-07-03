import type { ContactHistoryEntry, ContactHistoryType } from "@/lib/contacts/types";

export function createContactHistoryEntry(
  type: ContactHistoryType,
  message: string,
  meta?: Pick<ContactHistoryEntry, "clientId" | "serviceId">,
): ContactHistoryEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type,
    message,
    clientId: meta?.clientId ?? null,
    serviceId: meta?.serviceId ?? null,
  };
}

export function normalizeContactHistory(value: unknown): ContactHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): ContactHistoryEntry | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const type = row.type;
      if (typeof type !== "string") {
        return null;
      }

      return {
        id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
        at: typeof row.at === "string" ? row.at : new Date().toISOString(),
        type: type as ContactHistoryEntry["type"],
        message: typeof row.message === "string" ? row.message : "",
        clientId: typeof row.clientId === "string" ? row.clientId : null,
        serviceId: typeof row.serviceId === "string" ? row.serviceId : null,
      };
    })
    .filter((entry): entry is ContactHistoryEntry => entry !== null);
}

export function appendContactHistory(
  history: ContactHistoryEntry[],
  entry: Omit<ContactHistoryEntry, "id" | "at"> & Partial<Pick<ContactHistoryEntry, "id" | "at">>,
): ContactHistoryEntry[] {
  return [
    ...history,
    {
      id: entry.id ?? crypto.randomUUID(),
      at: entry.at ?? new Date().toISOString(),
      type: entry.type,
      message: entry.message,
      clientId: entry.clientId ?? null,
      serviceId: entry.serviceId ?? null,
    },
  ];
}
