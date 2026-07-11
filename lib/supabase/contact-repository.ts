import { appendContactHistory, createContactHistoryEntry } from "@/lib/contacts/history";
import type { Contact, ContactInput } from "@/lib/contacts/types";
import {
  contactInputToInsert,
  contactToInsert,
  rowToContact,
} from "@/lib/supabase/contact-mappers";
import { getSupabase } from "@/lib/supabase/client";

export async function fetchContacts(): Promise<Contact[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToContact);
}

export async function createContactRecord(input: ContactInput): Promise<Contact> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const history = [
    createContactHistoryEntry("created", "Kontakt dodany do bazy Kontaktów."),
  ];

  const { data, error } = await supabase
    .from("contacts")
    .insert(contactInputToInsert(input, { createdAt: now, updatedAt: now, history, handledAt: now }))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}

export async function updateContactRecord(id: string, input: ContactInput): Promise<Contact> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existing) {
    throw new Error("Nie znaleziono kontaktu.");
  }

  const contact = rowToContact(existing);
  const now = new Date().toISOString();
  const history = appendContactHistory(
    contact.history,
    createContactHistoryEntry("updated", "Zaktualizowano dane kontaktu."),
  );

  const { data, error } = await supabase
    .from("contacts")
    .update({
      ...contactInputToInsert(input, { updatedAt: now }),
      history,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}

export async function deleteContactRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function appendContactHistoryRecord(
  contactId: string,
  type: Contact["history"][number]["type"],
  message: string,
  meta?: { clientId?: string | null; serviceId?: string | null },
): Promise<Contact> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existing) {
    throw new Error("Nie znaleziono kontaktu.");
  }

  const contact = rowToContact(existing);
  const history = appendContactHistory(
    contact.history,
    createContactHistoryEntry(type, message, meta),
  );
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("contacts")
    .update({ history, updated_at: now })
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}

export async function upsertContactRecord(contact: Contact): Promise<Contact> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .upsert(contactToInsert(contact), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToContact(data);
}
