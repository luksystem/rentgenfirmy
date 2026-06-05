import type { ClientRow, ClientInsert } from "@/lib/supabase/database.types";
import type { Client, ClientInput } from "@/lib/service/types";

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    fullName: row.full_name,
    location: row.location,
    email: row.email,
    phone: row.phone,
    notes: row.notes ?? undefined,
    externalId: row.external_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function clientInputToInsert(
  input: ClientInput,
  audit?: { createdAt?: string; updatedAt?: string },
): ClientInsert {
  const now = new Date().toISOString();

  return {
    full_name: input.fullName.trim(),
    location: input.location.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes: input.notes?.trim() || null,
    external_id: input.externalId?.trim() || null,
    created_at: audit?.createdAt ?? now,
    updated_at: audit?.updatedAt ?? now,
  };
}

export function clientToInsert(client: Client): ClientInsert {
  return {
    id: client.id,
    full_name: client.fullName,
    location: client.location,
    email: client.email,
    phone: client.phone,
    notes: client.notes ?? null,
    external_id: client.externalId ?? null,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}
