import { getSupabase } from "@/lib/supabase/client";
import type {
  ChatAttachment,
  ChatAttachmentKind,
  ChatMessage,
  ChatMessageWithExtras,
  ChatPin,
  ChatReaction,
  ChatRoom,
  ChatRoomKind,
  ChatRoomMember,
} from "@/lib/chat/types";

type ChatRoomRow = {
  id: string;
  project_id: string;
  client_id: string | null;
  service_intake_request_id: string | null;
  kind: string;
  name: string;
  slug: string;
  is_default: boolean;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  room_id: string;
  author_id: string | null;
  is_system: boolean;
  system_event_kind: string | null;
  system_event_payload: Record<string, unknown> | null;
  body: string;
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  is_important: boolean;
  created_at: string;
};

type ChatRoomMemberRow = {
  id: string;
  room_id: string;
  profile_id: string;
  role_in_room: string;
  muted: boolean;
  pinned_room: boolean;
  last_read_message_id: string | null;
  last_read_at: string | null;
  added_by: string | null;
  created_at: string;
};

type ChatAttachmentRow = {
  id: string;
  message_id: string;
  project_document_id: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  kind: string;
  created_at: string;
};

type ChatReactionRow = {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
};

type ChatPinRow = {
  id: string;
  room_id: string;
  message_id: string;
  pinned_by: string | null;
  created_at: string;
};

function rowToRoom(row: ChatRoomRow): ChatRoom {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    serviceIntakeRequestId: row.service_intake_request_id,
    kind: row.kind as ChatRoomKind,
    name: row.name,
    slug: row.slug,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    authorId: row.author_id,
    isSystem: row.is_system,
    systemEventKind: row.system_event_kind,
    systemEventPayload: row.system_event_payload,
    body: row.body,
    replyToId: row.reply_to_id,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    isImportant: row.is_important,
    createdAt: row.created_at,
  };
}

function rowToMember(row: ChatRoomMemberRow): ChatRoomMember {
  return {
    id: row.id,
    roomId: row.room_id,
    profileId: row.profile_id,
    roleInRoom: row.role_in_room === "owner" ? "owner" : "member",
    muted: row.muted,
    pinnedRoom: row.pinned_room,
    lastReadMessageId: row.last_read_message_id,
    lastReadAt: row.last_read_at,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

function rowToAttachment(row: ChatAttachmentRow): ChatAttachment {
  return {
    id: row.id,
    messageId: row.message_id,
    projectDocumentId: row.project_document_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    kind: row.kind as ChatAttachmentKind,
    createdAt: row.created_at,
  };
}

function rowToReaction(row: ChatReactionRow): ChatReaction {
  return { id: row.id, messageId: row.message_id, profileId: row.profile_id, emoji: row.emoji, createdAt: row.created_at };
}

function rowToPin(row: ChatPinRow): ChatPin {
  return { id: row.id, roomId: row.room_id, messageId: row.message_id, pinnedBy: row.pinned_by, createdAt: row.created_at };
}

/** Pokoje widoczne dla aktualnie zalogowanego usera — filtrowane przez RLS (is_chat_room_member). */
export async function fetchVisibleChatRooms(options?: { projectId?: string }): Promise<ChatRoom[]> {
  const supabase = getSupabase();
  let query = supabase.from("chat_rooms").select("*").eq("is_archived", false).order("is_default", { ascending: false }).order("name");
  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToRoom(row as ChatRoomRow));
}

export async function fetchChatRoom(roomId: string): Promise<ChatRoom | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? rowToRoom(data as ChatRoomRow) : null;
}

export async function fetchChatRoomMembers(roomId: string): Promise<ChatRoomMember[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("chat_room_members").select("*").eq("room_id", roomId);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToMember(row as ChatRoomMemberRow));
}

export type ChatRoomMemberWithProfile = ChatRoomMember & {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export async function fetchChatRoomMembersWithProfiles(roomId: string): Promise<ChatRoomMemberWithProfile[]> {
  const members = await fetchChatRoomMembers(roomId);
  const profiles = await fetchProfilesLite(members.map((m) => m.profileId));
  return members.map((member) => {
    const profile = profiles.get(member.profileId);
    return {
      ...member,
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      avatarUrl: profile?.avatarUrl ?? null,
    };
  });
}

export async function fetchChatPins(roomId: string): Promise<ChatPin[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_pins")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToPin(row as ChatPinRow));
}

type ProfileLite = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

async function fetchProfilesLite(profileIds: string[]): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(profileIds)];
  const map = new Map<string, ProfileLite>();
  if (!unique.length) {
    return map;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", unique);
  if (error) {
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    const r = row as { id: string; first_name: string; last_name: string; avatar_url: string | null };
    map.set(r.id, { id: r.id, firstName: r.first_name, lastName: r.last_name, avatarUrl: r.avatar_url });
  }
  return map;
}

/** Historia wiadomości pokoju (najnowsze pierwsze), z autorem/reakcjami/załącznikami/przeczytaniami. */
export async function fetchChatMessagesPage(
  roomId: string,
  options?: { beforeCreatedAt?: string; limit?: number },
): Promise<ChatMessageWithExtras[]> {
  const supabase = getSupabase();
  const limit = options?.limit ?? 50;
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options?.beforeCreatedAt) {
    query = query.lt("created_at", options.beforeCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  const messages = (data ?? []).map((row) => rowToMessage(row as ChatMessageRow));
  return attachMessageExtras(messages);
}

export async function attachMessageExtras(messages: ChatMessage[]): Promise<ChatMessageWithExtras[]> {
  if (!messages.length) {
    return [];
  }
  const supabase = getSupabase();
  const messageIds = messages.map((m) => m.id);
  const replyToIds = messages.map((m) => m.replyToId).filter((id): id is string => Boolean(id));

  const [reactionsRes, attachmentsRes, readsRes, repliesRes] = await Promise.all([
    supabase.from("chat_reactions").select("*").in("message_id", messageIds),
    supabase.from("chat_attachments").select("*").in("message_id", messageIds),
    supabase.from("chat_reads").select("message_id, profile_id").in("message_id", messageIds),
    replyToIds.length
      ? supabase.from("chat_messages").select("id, body, author_id, is_deleted").in("id", replyToIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (reactionsRes.error) throw new Error(reactionsRes.error.message);
  if (attachmentsRes.error) throw new Error(attachmentsRes.error.message);
  if (readsRes.error) throw new Error(readsRes.error.message);
  if (repliesRes.error) throw new Error(repliesRes.error.message);

  const authorIds = messages.map((m) => m.authorId).filter((id): id is string => Boolean(id));
  const profiles = await fetchProfilesLite(authorIds);

  const reactionsByMessage = new Map<string, ChatReaction[]>();
  for (const row of (reactionsRes.data ?? []) as ChatReactionRow[]) {
    const reaction = rowToReaction(row);
    const list = reactionsByMessage.get(reaction.messageId) ?? [];
    list.push(reaction);
    reactionsByMessage.set(reaction.messageId, list);
  }

  const attachmentsByMessage = new Map<string, ChatAttachment[]>();
  for (const row of (attachmentsRes.data ?? []) as ChatAttachmentRow[]) {
    const attachment = rowToAttachment(row);
    const list = attachmentsByMessage.get(attachment.messageId) ?? [];
    list.push(attachment);
    attachmentsByMessage.set(attachment.messageId, list);
  }

  const readsByMessage = new Map<string, string[]>();
  for (const row of (readsRes.data ?? []) as { message_id: string; profile_id: string }[]) {
    const list = readsByMessage.get(row.message_id) ?? [];
    list.push(row.profile_id);
    readsByMessage.set(row.message_id, list);
  }

  const repliesById = new Map<string, { id: string; body: string; author_id: string | null; is_deleted: boolean }>();
  for (const row of (repliesRes.data ?? []) as { id: string; body: string; author_id: string | null; is_deleted: boolean }[]) {
    repliesById.set(row.id, row);
  }

  return messages.map((message) => {
    const author = message.authorId ? profiles.get(message.authorId) : undefined;
    const reply = message.replyToId ? repliesById.get(message.replyToId) : undefined;
    return {
      ...message,
      authorName: author ? `${author.firstName} ${author.lastName}`.trim() : null,
      authorAvatarUrl: author?.avatarUrl ?? null,
      reactions: reactionsByMessage.get(message.id) ?? [],
      attachments: attachmentsByMessage.get(message.id) ?? [],
      readByProfileIds: readsByMessage.get(message.id) ?? [],
      replyTo: reply
        ? { id: reply.id, body: reply.body, authorId: reply.author_id, isDeleted: reply.is_deleted }
        : null,
    } satisfies ChatMessageWithExtras;
  });
}

export async function markChatMessageRead(messageId: string, profileId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_reads")
    .upsert({ message_id: messageId, profile_id: profileId, read_at: new Date().toISOString() }, { onConflict: "message_id,profile_id" });
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateChatRoomMemberReadState(roomId: string, profileId: string, lastReadMessageId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_room_members")
    .update({ last_read_message_id: lastReadMessageId, last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function toggleChatRoomMute(roomId: string, profileId: string, muted: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_room_members")
    .update({ muted })
    .eq("room_id", roomId)
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function addChatReaction(messageId: string, profileId: string, emoji: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("chat_reactions").insert({ message_id: messageId, profile_id: profileId, emoji });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function removeChatReaction(messageId: string, profileId: string, emoji: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("profile_id", profileId)
    .eq("emoji", emoji);
  if (error) {
    throw new Error(error.message);
  }
}

/** Zmiana nazwy/archiwizacja pokoju custom — chronione przez RLS (can_manage_chat_room). */
export async function updateChatRoomDetails(roomId: string, input: { name?: string; isArchived?: boolean }) {
  const supabase = getSupabase();
  const payload: { updated_at: string; name?: string; is_archived?: boolean } = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) payload.name = input.name;
  if (input.isArchived !== undefined) payload.is_archived = input.isArchived;
  const { error } = await supabase.from("chat_rooms").update(payload).eq("id", roomId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Usunięcie uczestnika pokoju custom/main — chronione przez RLS (can_manage_chat_room). */
export async function removeChatRoomMember(roomId: string, profileId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("profile_id", profileId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchChatRoomAttachments(roomId: string): Promise<ChatAttachment[]> {
  const supabase = getSupabase();
  const { data: messageRows, error: messageError } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("room_id", roomId);
  if (messageError) {
    throw new Error(messageError.message);
  }
  const messageIds = (messageRows ?? []).map((row) => row.id as string);
  if (!messageIds.length) {
    return [];
  }
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .in("message_id", messageIds)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => rowToAttachment(row as ChatAttachmentRow));
}

export async function addChatPin(roomId: string, messageId: string, pinnedBy: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_pins")
    .insert({ room_id: roomId, message_id: messageId, pinned_by: pinnedBy });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function removeChatPin(roomId: string, messageId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("chat_pins").delete().eq("room_id", roomId).eq("message_id", messageId);
  if (error) {
    throw new Error(error.message);
  }
}
