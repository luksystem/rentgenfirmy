import { getSupabase } from "@/lib/supabase/client";
import {
  clientInputToInsert,
  clientToInsert,
  rowToClient,
} from "@/lib/supabase/client-mappers";
import { geocodePartyAddress } from "@/lib/party/geocode-party";
import { resolvePartyGpsOnSave } from "@/lib/party/gps";
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

async function withResolvedGps(
  input: ClientInput,
  previous: Client | null,
): Promise<ClientInput> {
  const gps = await resolvePartyGpsOnSave(input, previous, geocodePartyAddress);
  return {
    ...input,
    lat: gps.lat,
    lng: gps.lng,
    gpsManual: gps.gpsManual,
  };
}

export async function createClientRecord(input: ClientInput): Promise<Client> {
  const supabase = getSupabase();
  const resolved = await withResolvedGps(input, null);
  const { data, error } = await supabase
    .from("clients")
    .insert(clientInputToInsert(resolved))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToClient(data);
}

export async function updateClientRecord(id: string, input: ClientInput): Promise<Client> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const previous = existing ? rowToClient(existing) : null;
  const resolved = await withResolvedGps(input, previous);

  const { data, error } = await supabase
    .from("clients")
    .update({
      ...clientInputToInsert(resolved, { updatedAt: new Date().toISOString() }),
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

/** Szybki zapis współrzędnych (np. backfill z mapy) — bez zmiany adresu. */
export async function patchClientGps(
  id: string,
  coords: { lat: number; lng: number; gpsManual?: boolean },
): Promise<Client> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .update({
      lat: coords.lat,
      lng: coords.lng,
      gps_manual: Boolean(coords.gpsManual),
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
