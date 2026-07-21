import type { ClientRow, ClientInsert } from "@/lib/supabase/database.types";
import type { Client, ClientInput } from "@/lib/service/types";

function numOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name,
    location: row.location,
    addressStreet: row.address_street ?? "",
    addressCity: row.address_city ?? "",
    addressPostalCode: row.address_postal_code ?? "",
    lat: numOrNull(row.lat),
    lng: numOrNull(row.lng),
    gpsManual: Boolean(row.gps_manual),
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
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    location: input.location.trim(),
    address_street: input.addressStreet.trim(),
    address_city: input.addressCity.trim(),
    address_postal_code: input.addressPostalCode.trim(),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    gps_manual: Boolean(input.gpsManual),
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
    first_name: client.firstName,
    last_name: client.lastName,
    location: client.location,
    address_street: client.addressStreet,
    address_city: client.addressCity,
    address_postal_code: client.addressPostalCode,
    lat: client.lat,
    lng: client.lng,
    gps_manual: client.gpsManual,
    email: client.email,
    phone: client.phone,
    notes: client.notes ?? null,
    external_id: client.externalId ?? null,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}
