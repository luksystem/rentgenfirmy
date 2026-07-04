import { appendContactHistory, createContactHistoryEntry } from "@/lib/contacts/history";
import type { Contact, ContactInput } from "@/lib/contacts/types";
import { contactInputToInsert, rowToContact } from "@/lib/supabase/contact-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

  const { data, error } = await supabase
    .from("contacts")
    .insert(
      contactInputToInsert(
        {
          fullName: input.fullName,
          location: input.location,
          addressStreet: input.addressStreet,
          addressCity: input.addressCity,
          addressPostalCode: input.addressPostalCode,
          email: input.email,
          phone: input.phone,
          notes: input.notes,
          externalId: input.externalId ?? null,
        },
        { createdAt: now, updatedAt: now, history },
      ),
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
