"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, PanelRight, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useChatPresenceStore, getTypingProfileIds } from "@/store/chat-presence-store";
import { useChatRoomRealtime } from "@/hooks/use-chat-room-realtime";
import { useChatTypingPresence } from "@/hooks/use-chat-typing-presence";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import type { ChatMessageWithExtras, ChatRoom } from "@/lib/chat/types";
import { Button } from "@/components/ui/button";

type ChatMessageListProps = {
  room: ChatRoom;
  currentProfileId: string;
  onBack: () => void;
  onToggleRightPanel: () => void;
  onMessageSent: () => void;
};

export function ChatMessageList({ room, currentProfileId, onBack, onToggleRightPanel, onMessageSent }: ChatMessageListProps) {
  const profile = useAuthStore((state) => state.profile);
  const messages = useChatStore((state) => state.messagesByRoom[room.id] ?? []);
  const members = useChatStore((state) => state.membersByRoom[room.id] ?? []);
  const pins = useChatStore((state) => state.pinsByRoom[room.id] ?? []);
  const hasMore = useChatStore((state) => state.hasMoreByRoom[room.id] ?? false);
  const loadRoomDetail = useChatStore((state) => state.loadRoomDetail);
  const loadOlderMessages = useChatStore((state) => state.loadOlderMessages);
  const markRoomRead = useChatStore((state) => state.markRoomRead);
  const editMessage = useChatStore((state) => state.editMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const togglePin = useChatStore((state) => state.togglePin);

  const [replyTo, setReplyTo] = useState<ChatMessageWithExtras | null>(null);
  const [editing, setEditing] = useState<ChatMessageWithExtras | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingByRoom = useChatPresenceStore((state) => state.typingByRoom);

  useChatRoomRealtime(room.id);
  const { notifyTyping } = useChatTypingPresence(room.id, currentProfileId);

  useEffect(() => {
    void loadRoomDetail(room.id);
  }, [room.id, loadRoomDetail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    void markRoomRead(room.id, currentProfileId);
  }, [room.id, messages.length, currentProfileId, markRoomRead]);

  const membership = members.find((m) => m.profileId === currentProfileId);
  const canModerate = profile?.role === "administrator" || profile?.role === "manager" || membership?.roleInRoom === "owner";
  const typingProfileIds = getTypingProfileIds(typingByRoom, room.id, currentProfileId);
  const typingNames = typingProfileIds
    .map((id) => {
      const member = members.find((m) => m.profileId === id);
      return member ? `${member.firstName} ${member.lastName}`.trim() : null;
    })
    .filter((name): name is string => Boolean(name));

  async function runSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const response = await fetch(`/api/chat/rooms/${room.id}/search?q=${encodeURIComponent(query)}`, {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      setSearchResults(data.messages ?? []);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
        <Button type="button" variant="ghost" size="sm" className="sm:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
          <p className="text-xs text-muted">{members.length} uczestników</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSearchOpen((v) => !v)}>
          <Search className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="lg:hidden" onClick={onToggleRightPanel}>
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>

      {searchOpen ? (
        <div className="border-b border-border/70 p-2">
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => void runSearch(event.target.value)}
            placeholder="Szukaj w wiadomościach…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent/40"
          />
          {searchResults.length > 0 ? (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-surface-muted/60">
              {searchResults.map((result) => (
                <div key={result.id} className="border-b border-border/40 px-2 py-1.5 text-xs last:border-0">
                  {result.body}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {pins.length > 0 ? (
        <div className="border-b border-border/70 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-300">
          📌 {pins.length} przypiętych wiadomości
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-2">
        {hasMore ? (
          <div className="flex justify-center pb-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadOlderMessages(room.id)}>
              Wczytaj starsze
            </Button>
          </div>
        ) : null}
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isOwn={message.authorId === currentProfileId}
            canModerate={canModerate}
            currentProfileId={currentProfileId}
            isPinned={pins.some((pin) => pin.messageId === message.id)}
            onReply={setReplyTo}
            onEdit={(msg) => {
              setEditing(msg);
              setEditValue(msg.body);
            }}
            onDelete={(msg) => void deleteMessage(room.id, msg.id)}
            onToggleReaction={(messageId, emoji) => {
              const current = messages.find((m) => m.id === messageId);
              const hasReacted = current?.reactions.some((r) => r.emoji === emoji && r.profileId === currentProfileId) ?? false;
              void toggleReaction(room.id, messageId, currentProfileId, emoji, hasReacted);
            }}
            onTogglePin={(messageId) => {
              const isPinned = pins.some((pin) => pin.messageId === messageId);
              void togglePin(room.id, messageId, currentProfileId, isPinned);
            }}
          />
        ))}
        {typingNames.length > 0 ? (
          <p className="px-4 py-1 text-xs italic text-muted">{typingNames.join(", ")} pisze…</p>
        ) : null}
      </div>

      {editing ? (
        <div className="border-t border-border/70 p-3">
          <p className="mb-1 text-xs text-muted">Edycja wiadomości</p>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent/40"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void editMessage(editing.id, editValue).then(() => setEditing(null));
              }}
            >
              Zapisz
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <ChatComposer
          roomId={room.id}
          members={members.map((m) => ({ profileId: m.profileId, firstName: m.firstName, lastName: m.lastName }))}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSent={onMessageSent}
          onTyping={notifyTyping}
        />
      )}
    </div>
  );
}
