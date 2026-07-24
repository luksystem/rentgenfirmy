"use client";

import { create } from "zustand";
import type { ChatMessageWithExtras, ChatPin, ChatRoom } from "@/lib/chat/types";
import {
  addChatPin,
  addChatReaction,
  attachMessageExtras,
  fetchChatMessagesPage,
  fetchChatPins,
  fetchChatRoomMembersWithProfiles,
  fetchVisibleChatRooms,
  type ChatRoomMemberWithProfile,
  markChatMessageRead,
  removeChatPin,
  removeChatReaction,
  toggleChatRoomMute,
  updateChatRoomMemberReadState,
} from "@/lib/supabase/chat-room-repository";

const PAGE_SIZE = 50;

type ChatState = {
  rooms: ChatRoom[];
  roomsLoaded: boolean;
  activeRoomId: string | null;
  messagesByRoom: Record<string, ChatMessageWithExtras[]>;
  hasMoreByRoom: Record<string, boolean>;
  membersByRoom: Record<string, ChatRoomMemberWithProfile[]>;
  pinsByRoom: Record<string, ChatPin[]>;
  loadingRoomId: string | null;

  loadRooms: (options?: { projectId?: string }) => Promise<void>;
  setActiveRoomId: (roomId: string | null) => void;
  loadRoomDetail: (roomId: string) => Promise<void>;
  loadOlderMessages: (roomId: string) => Promise<void>;
  upsertMessage: (message: ChatMessageWithExtras) => void;
  refetchMessage: (roomId: string, messageId: string) => Promise<void>;
  removeMessageLocally: (roomId: string, messageId: string) => void;
  sendTextMessage: (roomId: string, body: string, replyToId?: string | null) => Promise<void>;
  editMessage: (messageId: string, body: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  toggleReaction: (roomId: string, messageId: string, profileId: string, emoji: string, hasReacted: boolean) => Promise<void>;
  markRoomRead: (roomId: string, profileId: string) => Promise<void>;
  toggleMute: (roomId: string, profileId: string, muted: boolean) => Promise<void>;
  togglePin: (roomId: string, messageId: string, profileId: string, pinned: boolean) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  roomsLoaded: false,
  activeRoomId: null,
  messagesByRoom: {},
  hasMoreByRoom: {},
  membersByRoom: {},
  pinsByRoom: {},
  loadingRoomId: null,

  loadRooms: async (options) => {
    const rooms = await fetchVisibleChatRooms(options);
    set({ rooms, roomsLoaded: true });
  },

  setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),

  loadRoomDetail: async (roomId) => {
    set({ loadingRoomId: roomId });
    try {
      const [messages, members, pins] = await Promise.all([
        fetchChatMessagesPage(roomId, { limit: PAGE_SIZE }),
        fetchChatRoomMembersWithProfiles(roomId),
        fetchChatPins(roomId),
      ]);
      set((state) => ({
        messagesByRoom: { ...state.messagesByRoom, [roomId]: messages.slice().reverse() },
        hasMoreByRoom: { ...state.hasMoreByRoom, [roomId]: messages.length === PAGE_SIZE },
        membersByRoom: { ...state.membersByRoom, [roomId]: members },
        pinsByRoom: { ...state.pinsByRoom, [roomId]: pins },
      }));
    } finally {
      set((state) => (state.loadingRoomId === roomId ? { loadingRoomId: null } : {}));
    }
  },

  loadOlderMessages: async (roomId) => {
    const existing = get().messagesByRoom[roomId] ?? [];
    const oldest = existing[0];
    if (!oldest) return;
    const older = await fetchChatMessagesPage(roomId, { beforeCreatedAt: oldest.createdAt, limit: PAGE_SIZE });
    set((state) => ({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: [...older.slice().reverse(), ...(state.messagesByRoom[roomId] ?? [])] },
      hasMoreByRoom: { ...state.hasMoreByRoom, [roomId]: older.length === PAGE_SIZE },
    }));
  },

  upsertMessage: (message) => {
    set((state) => {
      const list = state.messagesByRoom[message.roomId] ?? [];
      const index = list.findIndex((m) => m.id === message.id);
      const nextList = index >= 0 ? [...list.slice(0, index), message, ...list.slice(index + 1)] : [...list, message];
      return { messagesByRoom: { ...state.messagesByRoom, [message.roomId]: nextList } };
    });
  },

  refetchMessage: async (roomId, messageId) => {
    const supabaseModule = await import("@/lib/supabase/client");
    const supabase = supabaseModule.getSupabase();
    const { data, error } = await supabase.from("chat_messages").select("*").eq("id", messageId).maybeSingle();
    if (error || !data) return;
    const [withExtras] = await attachMessageExtras([
      {
        id: data.id,
        roomId: data.room_id,
        authorId: data.author_id,
        isSystem: data.is_system,
        systemEventKind: data.system_event_kind,
        systemEventPayload: data.system_event_payload,
        body: data.body,
        replyToId: data.reply_to_id,
        isEdited: data.is_edited,
        editedAt: data.edited_at,
        isDeleted: data.is_deleted,
        deletedAt: data.deleted_at,
        isImportant: data.is_important,
        createdAt: data.created_at,
      },
    ]);
    if (withExtras) {
      get().upsertMessage(withExtras);
    }
  },

  removeMessageLocally: (roomId, messageId) => {
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: (state.messagesByRoom[roomId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
  },

  sendTextMessage: async (roomId, body, replyToId) => {
    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roomId, body, replyToId: replyToId ?? null }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Nie udało się wysłać wiadomości.");
    }
  },

  editMessage: async (messageId, body) => {
    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Nie udało się edytować wiadomości.");
    }
  },

  deleteMessage: async (roomId, messageId) => {
    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? "Nie udało się usunąć wiadomości.");
    }
    await get().refetchMessage(roomId, messageId);
  },

  toggleReaction: async (roomId, messageId, profileId, emoji, hasReacted) => {
    if (hasReacted) {
      await removeChatReaction(messageId, profileId, emoji);
    } else {
      await addChatReaction(messageId, profileId, emoji);
    }
    await get().refetchMessage(roomId, messageId);
  },

  markRoomRead: async (roomId, profileId) => {
    const messages = get().messagesByRoom[roomId] ?? [];
    const last = messages[messages.length - 1];
    if (!last) return;
    await Promise.all([
      markChatMessageRead(last.id, profileId),
      updateChatRoomMemberReadState(roomId, profileId, last.id),
    ]).catch(() => undefined);
  },

  toggleMute: async (roomId, profileId, muted) => {
    await toggleChatRoomMute(roomId, profileId, muted);
    set((state) => ({
      membersByRoom: {
        ...state.membersByRoom,
        [roomId]: (state.membersByRoom[roomId] ?? []).map((m) => (m.profileId === profileId ? { ...m, muted } : m)),
      },
    }));
  },

  togglePin: async (roomId, messageId, profileId, pinned) => {
    if (pinned) {
      await removeChatPin(roomId, messageId);
    } else {
      await addChatPin(roomId, messageId, profileId);
    }
    const pins = await fetchChatPins(roomId);
    set((state) => ({ pinsByRoom: { ...state.pinsByRoom, [roomId]: pins } }));
  },
}));
