import { appendContactHistory, createContactHistoryEntry } from "@/lib/contacts/history";
import { isContactConverted, type Contact, type ContactInput } from "@/lib/contacts/types";
import { splitPartyFullName } from "@/lib/party/display-name";
import { buildPartyGeocodeQueries, resolvePartyGpsOnSave } from "@/lib/party/gps";
import { geocodeAddressServer } from "@/lib/service/geocode-server";
import { contactInputToInsert, rowToContact } from "@/lib/supabase/contact-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function resolveContactGpsAdmin(
  input: ContactInput,
  previous: Contact | null,
): Promise<ContactInput> {
  const gps = await resolvePartyGpsOnSave(input, previous, async (party) => {
    for (const query of buildPartyGeocodeQueries(party)) {
      const result = await geocodeAddressServer(query);
      if (result) {
        return result;
      }
    }
    return null;
  });
  return { ...input, lat: gps.lat, lng: gps.lng, gpsManual: gps.gpsManual };
}

function normalizeContactEmail(email: string) {
  return email.trim().toLowerCase();
}

function pickPreferredContact(matches: Contact[]): Contact {
  const active = matches
    .filter((contact) => !contact.convertedClientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (active.length > 0) {
    return active[0];
  }

  return [...matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

async function findContactByEmailAdmin(email: string): Promise<Contact | null> {
  const normalized = normalizeContactEmail(email);
  if (!normalized) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .ilike("email", normalized)
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const matches = (data ?? [])
    .map(rowToContact)
    .filter((contact) => normalizeContactEmail(contact.email) === normalized);

  return matches.length > 0 ? pickPreferredContact(matches) : null;
}

function mergeIntakeIntoExistingContact(
  existing: Contact,
  input: ContactInput,
): ContactInput {
  const intakeNotes = input.notes?.trim() ?? "";
  const existingNotes = existing.notes?.trim() ?? "";
  const notes =
    intakeNotes && existingNotes && !existingNotes.includes(intakeNotes)
      ? `${existingNotes}\n\n${intakeNotes}`
      : intakeNotes || existingNotes;

  return {
    firstName: existing.firstName.trim() || input.firstName.trim(),
    lastName: existing.lastName.trim() || input.lastName.trim(),
    location: existing.location.trim() || input.location.trim(),
    addressStreet: existing.addressStreet.trim() || input.addressStreet.trim(),
    addressCity: existing.addressCity.trim() || input.addressCity.trim(),
    addressPostalCode: existing.addressPostalCode.trim() || input.addressPostalCode.trim(),
    email: existing.email.trim() || input.email.trim(),
    phone: existing.phone.trim() || input.phone.trim(),
    notes,
    externalId: existing.externalId ?? input.externalId ?? null,
  };
}

async function linkExistingContactFromIntakeAdmin(
  existing: Contact,
  input: ContactInput & { intakeReference?: string },
): Promise<Contact> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const merged = await resolveContactGpsAdmin(
    mergeIntakeIntoExistingContact(existing, input),
    existing,
  );
  const historyMessage = input.intakeReference
    ? `Powiązano zgłoszenie ${input.intakeReference} z istniejącym kontaktem (ten sam e-mail).`
    : "Powiązano zgłoszenie z istniejącym kontaktem (ten sam e-mail).";

  const history = appendContactHistory(
    existing.history,
    createContactHistoryEntry("offer_linked", historyMessage),
  );

  const { data, error } = await supabase
    .from("contacts")
    .update({
      ...contactInputToInsert(merged, { updatedAt: now }),
      handled_at: null,
      history,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}

function normalizeIntakeContactInput(
  input:
    | (ContactInput & { intakeReference?: string })
    | (Omit<ContactInput, "firstName" | "lastName"> & { fullName: string; intakeReference?: string }),
): ContactInput & { intakeReference?: string } {
  if ("fullName" in input) {
    const { fullName, ...rest } = input;
    return { ...rest, ...splitPartyFullName(fullName) };
  }

  return input;
}

export async function resolveContactFromIntakeAdmin(
  input:
    | (ContactInput & { intakeReference?: string })
    | (Omit<ContactInput, "firstName" | "lastName"> & { fullName: string; intakeReference?: string }),
): Promise<{ contact: Contact; reusedExisting: boolean }> {
  const normalizedInput = normalizeIntakeContactInput(input);

  const existing = await findContactByEmailAdmin(normalizedInput.email);
  if (existing && !isContactConverted(existing)) {
    const contact = await linkExistingContactFromIntakeAdmin(existing, normalizedInput);
    return { contact, reusedExisting: true };
  }

  const contact = await createContactFromIntakeAdmin(normalizedInput);
  return { contact, reusedExisting: false };
}

export async function createContactFromIntakeAdmin(
  input: ContactInput & { intakeReference?: string },
): Promise<Contact> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const historyMessage = input.intakeReference
    ? `Kontakt utworzony z formularza zgłoszenia (${input.intakeReference}).`
    : "Kontakt utworzony z formularza zgłoszenia (gość).";

  const history = [
    createContactHistoryEntry("created", historyMessage),
  ];

  const resolved = await resolveContactGpsAdmin(
    {
      firstName: input.firstName,
      lastName: input.lastName,
      location: input.location,
      addressStreet: input.addressStreet,
      addressCity: input.addressCity,
      addressPostalCode: input.addressPostalCode,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      externalId: input.externalId ?? null,
    },
    null,
  );

  const { data, error } = await supabase
    .from("contacts")
    .insert(
      contactInputToInsert(resolved, {
        createdAt: now,
        updatedAt: now,
        history,
        handledAt: null,
      }),
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}

export async function appendContactHistoryAdmin(
  contactId: string,
  type: Contact["history"][number]["type"],
  message: string,
  meta?: { clientId?: string | null; serviceId?: string | null },
) {
  const supabase = getSupabaseAdmin();
  const { data: row, error: fetchError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!row) {
    return;
  }

  const contact = rowToContact(row);
  const history = appendContactHistory(
    contact.history,
    createContactHistoryEntry(type, message, meta),
  );

  const { error } = await supabase
    .from("contacts")
    .update({ history, updated_at: new Date().toISOString() })
    .eq("id", contactId);

  if (error) {
    throw new Error(error.message);
  }
}
