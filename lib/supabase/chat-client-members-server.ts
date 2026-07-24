import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatClientMember } from "@/lib/chat/types";

type AdminClient = SupabaseClient;

type ChatClientMemberRow = {
  id: string;
  client_id: string;
  profile_id: string;
  is_primary: boolean;
  created_at: string;
};

function rowToChatClientMember(row: ChatClientMemberRow): ChatClientMember {
  return {
    id: row.id,
    clientId: row.client_id,
    profileId: row.profile_id,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

/**
 * Kontakty klienta dopuszczone do pokoju "Klient" — wpisy tutaj są jedynym źródłem prawdy
 * dla członkostwa w pokoju Klient (trigger 194_chat_project_triggers.sql synchronizuje
 * chat_room_members automatycznie po insert/delete).
 */
export async function fetchClientChatMembersServer(admin: AdminClient, clientId: string): Promise<ChatClientMember[]> {
  const { data, error } = await admin
    .from("chat_client_members")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToChatClientMember(row as ChatClientMemberRow));
}

export async function addClientChatMemberServer(
  admin: AdminClient,
  clientId: string,
  profileId: string,
  isPrimary = false,
): Promise<ChatClientMember> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile || profile.role !== "klient") {
    throw new Error("Do pokoju Klient można dodać wyłącznie profil z rolą 'klient'.");
  }

  const { data, error } = await admin
    .from("chat_client_members")
    .upsert({ client_id: clientId, profile_id: profileId, is_primary: isPrimary }, { onConflict: "client_id,profile_id" })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return rowToChatClientMember(data as ChatClientMemberRow);
}

export async function removeClientChatMemberServer(admin: AdminClient, clientId: string, profileId: string) {
  const { error } = await admin
    .from("chat_client_members")
    .delete()
    .eq("client_id", clientId)
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}
