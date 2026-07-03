import type { ContactRow, ContactInsert } from "@/lib/supabase/database.types";
import { normalizeContactHistory } from "@/lib/contacts/history";
import type {
  Contact,
  ContactConversionSource,
  ContactInput,
} from "@/lib/contacts/types";

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    fullName: row.full_name,
    location: row.location,
    addressStreet: row.address_street ?? "",
    addressCity: row.address_city ?? "",
    addressPostalCode: row.address_postal_code ?? "",
    email: row.email,
    phone: row.phone,
    notes: row.notes ?? undefined,
    externalId: row.external_id,
    convertedClientId: row.converted_client_id,
    convertedAt: row.converted_at,
    conversionSource: row.conversion_source as ContactConversionSource | null,
    history: normalizeContactHistory(row.history),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contactInputToInsert(
  input: ContactInput,
  audit?: { createdAt?: string; updatedAt?: string; history?: Contact["history"] },
): ContactInsert {
  const now = new Date().toISOString();

  return {
    full_name: input.fullName.trim(),
    location: input.location.trim(),
    address_street: input.addressStreet.trim(),
    address_city: input.addressCity.trim(),
    address_postal_code: input.addressPostalCode.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes: input.notes?.trim() || null,
    external_id: input.externalId?.trim() || null,
    history: audit?.history ?? [],
    created_at: audit?.createdAt ?? now,
    updated_at: audit?.updatedAt ?? now,
  };
}

export function contactToInsert(contact: Contact): ContactInsert {
  return {
    id: contact.id,
    full_name: contact.fullName,
    location: contact.location,
    address_street: contact.addressStreet,
    address_city: contact.addressCity,
    address_postal_code: contact.addressPostalCode,
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes ?? null,
    external_id: contact.externalId ?? null,
    converted_client_id: contact.convertedClientId,
    converted_at: contact.convertedAt,
    conversion_source: contact.conversionSource,
    history: contact.history,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  };
}
