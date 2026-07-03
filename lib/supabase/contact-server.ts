import { appendContactHistory, createContactHistoryEntry } from "@/lib/contacts/history";
import {
  contactToClientInput,
  contactToServiceClient,
  type Contact,
  type ContactConversionSource,
} from "@/lib/contacts/types";
import { clientToServiceClient, type Client } from "@/lib/service/types";
import { clientInputToInsert, rowToClient } from "@/lib/supabase/client-mappers";
import { rowToContact } from "@/lib/supabase/contact-mappers";
import { dispatchClientCreatedSms } from "@/lib/supabase/sms-rules-server";
import { getSupabaseServer } from "@/lib/supabase/server";

export type ConvertContactResult = {
  contact: Contact;
  client: Client;
  created: boolean;
};

export async function convertContactToClientServer(
  contactId: string,
  options: {
    source: ContactConversionSource;
    serviceId?: string | null;
  },
): Promise<ConvertContactResult> {
  const supabase = getSupabaseServer();

  const { data: contactRow, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (!contactRow) {
    throw new Error("Nie znaleziono kontaktu.");
  }

  const contact = rowToContact(contactRow);

  if (contact.convertedClientId) {
    const { data: existingClient, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", contact.convertedClientId)
      .maybeSingle();

    if (clientError) {
      throw new Error(clientError.message);
    }

    if (existingClient) {
      return {
        contact,
        client: rowToClient(existingClient),
        created: false,
      };
    }
  }

  const now = new Date().toISOString();
  const historyType =
    options.source === "manual" ? "converted_manual" : "converted_offer_accepted";
  const historyMessage =
    options.source === "manual"
      ? "Kontakt przekształcono ręcznie w klienta."
      : "Kontakt zaakceptował ofertę — utworzono klienta i zlecenie.";

  const { data: createdClientRow, error: createError } = await supabase
    .from("clients")
    .insert(clientInputToInsert(contactToClientInput(contact), { createdAt: now, updatedAt: now }))
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  const client = rowToClient(createdClientRow);

  const updatedHistory = appendContactHistory(contact.history, {
    type: historyType,
    message: historyMessage,
    clientId: client.id,
    serviceId: options.serviceId ?? null,
    at: now,
  });

  const { data: updatedContactRow, error: updateError } = await supabase
    .from("contacts")
    .update({
      converted_client_id: client.id,
      converted_at: now,
      conversion_source: options.source,
      history: updatedHistory,
      updated_at: now,
    })
    .eq("id", contactId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  void dispatchClientCreatedSms(client).catch(() => undefined);

  return {
    contact: rowToContact(updatedContactRow),
    client,
    created: true,
  };
}

export async function appendContactHistoryServer(
  contactId: string,
  type: Contact["history"][number]["type"],
  message: string,
  meta?: { clientId?: string | null; serviceId?: string | null },
) {
  const supabase = getSupabaseServer();
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

export { contactToServiceClient, clientToServiceClient };
