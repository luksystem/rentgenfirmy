import { getSupabase } from "@/lib/supabase/client";
import {
  clientInputToInsert,
  clientToInsert,
  rowToClient,
} from "@/lib/supabase/client-mappers";
import type { Client, ClientInput } from "@/lib/service/types";

export async function fetchClients(): Promise<Client[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToClient);
}

export async function createClientRecord(input: ClientInput): Promise<Client> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .insert(clientInputToInsert(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToClient(data);
}

export async function updateClientRecord(id: string, input: ClientInput): Promise<Client> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update({
      ...clientInputToInsert(input, { updatedAt: new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToClient(data);
}

export async function deleteClientRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertClientByExternalId(input: ClientInput): Promise<Client> {
  if (input.externalId?.trim()) {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from("clients")
      .select("*")
      .eq("external_id", input.externalId.trim())
      .maybeSingle();

    if (existing) {
      return updateClientRecord(existing.id, input);
    }
  }

  return createClientRecord(input);
}

export async function upsertClientRecord(client: Client): Promise<Client> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .upsert(clientToInsert(client), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToClient(data);
}
