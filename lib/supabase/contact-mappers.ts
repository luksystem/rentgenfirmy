import type { ContactRow, ContactInsert } from "@/lib/supabase/database.types";
import { normalizeContactHistory } from "@/lib/contacts/history";
import type {
  Contact,
  ContactConversionSource,
  ContactInput,
} from "@/lib/contacts/types";

function numOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rowToContact(row: ContactRow): Contact {
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
    gpsAddressFingerprint: row.gps_address_fingerprint ?? null,
    email: row.email,
    phone: row.phone,
    notes: row.notes ?? undefined,
    externalId: row.external_id,
    convertedClientId: row.converted_client_id,
    convertedAt: row.converted_at,
    conversionSource: row.conversion_source as ContactConversionSource | null,
    handledAt: row.handled_at,
    history: normalizeContactHistory(row.history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contactInputToInsert(
  input: ContactInput,
  audit?: {
    createdAt?: string;
    updatedAt?: string;
    history?: Contact["history"];
    handledAt?: string | null;
  },
): ContactInsert {
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
    gps_address_fingerprint: input.gpsAddressFingerprint ?? null,
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes: input.notes?.trim() || null,
    external_id: input.externalId?.trim() || null,
    handled_at: audit?.handledAt ?? null,
    history: audit?.history ?? [],
    created_at: audit?.createdAt ?? now,
    updated_at: audit?.updatedAt ?? now,
  };
}

export function contactToInsert(contact: Contact): ContactInsert {
  return {
    id: contact.id,
    first_name: contact.firstName,
    last_name: contact.lastName,
    location: contact.location,
    address_street: contact.addressStreet,
    address_city: contact.addressCity,
    address_postal_code: contact.addressPostalCode,
    lat: contact.lat,
    lng: contact.lng,
    gps_manual: contact.gpsManual,
    gps_address_fingerprint: contact.gpsAddressFingerprint,
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes ?? null,
    external_id: contact.externalId ?? null,
    converted_client_id: contact.convertedClientId,
    converted_at: contact.convertedAt,
    conversion_source: contact.conversionSource,
    handled_at: contact.handledAt,
    history: contact.history,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  };
}
