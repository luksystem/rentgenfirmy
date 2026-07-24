"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useChatStore } from "@/store/chat-store";
import { attachMessageExtras } from "@/lib/supabase/chat-room-repository";
import type { ChatMessage } from "@/lib/chat/types";

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

function rowToMessage(row: ChatMessageRow): ChatMessage {
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

/**
 * Realtime dla aktywnego pokoju czatu — świadome odejście od wzorca "realtime = nudge to
 * refetch" (use-notifications-realtime.ts): INSERT na chat_messages jest scalany bezpośrednio
 * (dociągając tylko brakujące dane autora/reakcji), żeby czat był responsywny jak WhatsApp.
 * UPDATE/DELETE i reactions/reads to celowany refetch tej jednej wiadomości, nie całego pokoju.
 */
export function useChatRoomRealtime(roomId: string | null) {
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const refetchMessage = useChatStore((state) => state.refetchMessage);
  const handlersRef = useRef({ upsertMessage, refetchMessage });
  handlersRef.current = { upsertMessage, refetchMessage };

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();
    const channelName = `chat-room-${roomId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const row = payload.new as ChatMessageRow;
          const [withExtras] = await attachMessageExtras([rowToMessage(row)]);
          if (withExtras) {
            handlersRef.current.upsertMessage(withExtras);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          void handlersRef.current.refetchMessage(roomId, row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reactions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { message_id?: string } | null;
          if (row?.message_id) {
            void handlersRef.current.refetchMessage(roomId, row.message_id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { message_id?: string } | null;
          if (row?.message_id) {
            void handlersRef.current.refetchMessage(roomId, row.message_id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);
}
