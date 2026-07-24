"use client";

import { useEffect, useState } from "react";
import { BellOff, File as FileIcon, Pin, UserPlus, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { Button } from "@/components/ui/button";
import { ChatInviteMemberDialog } from "@/components/chat/chat-invite-member-dialog";
import { ChatClientMemberManager } from "@/components/chat/chat-client-member-manager";
import {
  fetchChatRoomAttachments,
  removeChatRoomMember,
  type ChatRoomMemberWithProfile,
} from "@/lib/supabase/chat-room-repository";
import type { ChatAttachment, ChatMessageWithExtras, ChatPin, ChatRoom } from "@/lib/chat/types";

type Tab = "members" | "files" | "pins";

// Referencje modułowe — patrz komentarz w chat-message-list.tsx (Zustand + `?? []` inline
// tworzy nową tablicę co render i wywala pętlę getSnapshot).
const EMPTY_MEMBERS: ChatRoomMemberWithProfile[] = [];
const EMPTY_PINS: ChatPin[] = [];
const EMPTY_MESSAGES: ChatMessageWithExtras[] = [];

export function ChatRightPanel({ room, currentProfileId }: { room: ChatRoom; currentProfileId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const members = useChatStore((state) => state.membersByRoom[room.id] ?? EMPTY_MEMBERS);
  const pins = useChatStore((state) => state.pinsByRoom[room.id] ?? EMPTY_PINS);
  const messages = useChatStore((state) => state.messagesByRoom[room.id] ?? EMPTY_MESSAGES);
  const loadRoomDetail = useChatStore((state) => state.loadRoomDetail);
  const toggleMute = useChatStore((state) => state.toggleMute);

  const [tab, setTab] = useState<Tab>("members");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const membership = members.find((m) => m.profileId === currentProfileId);
  const canModerate = profile?.role === "administrator" || profile?.role === "manager" || membership?.roleInRoom === "owner";

  useEffect(() => {
    if (tab === "files") {
      void fetchChatRoomAttachments(room.id).then(setAttachments);
    }
  }, [tab, room.id]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex border-b border-border/70">
        {(
          [
            ["members", "Uczestnicy"],
            ["files", "Pliki"],
            ["pins", "Przypięte"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 px-2 py-2.5 text-xs font-medium transition ${
              tab === key ? "border-b-2 border-accent text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "members" ? (
          <div className="flex flex-col gap-1">
            {canModerate && room.kind !== "client" ? (
              <Button type="button" variant="secondary" size="sm" className="mb-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Dodaj uczestnika
              </Button>
            ) : null}
            {room.kind === "client" && profile?.role === "administrator" && room.clientId ? (
              <div className="mb-3">
                <ChatClientMemberManager clientId={room.clientId} onLinked={() => void loadRoomDetail(room.id)} />
              </div>
            ) : null}
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted">
                <span className="truncate text-foreground/85">
                  {member.firstName} {member.lastName}
                  {member.roleInRoom === "owner" ? <span className="ml-1 text-[10px] text-muted">(właściciel)</span> : null}
                </span>
                {member.profileId === currentProfileId ? (
                  <button
                    type="button"
                    title={member.muted ? "Włącz powiadomienia" : "Wycisz pokój"}
                    onClick={() => void toggleMute(room.id, currentProfileId, !member.muted)}
                    className="rounded p-1 text-muted hover:bg-surface"
                  >
                    <BellOff className={`h-3.5 w-3.5 ${member.muted ? "text-accent" : ""}`} />
                  </button>
                ) : canModerate && room.kind !== "client" ? (
                  <button
                    type="button"
                    title="Usuń z pokoju"
                    onClick={() => void removeChatRoomMember(room.id, member.profileId).then(() => loadRoomDetail(room.id))}
                    className="rounded p-1 text-muted hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {tab === "files" ? (
          <div className="flex flex-col gap-1">
            {attachments.length === 0 ? (
              <p className="text-xs text-muted">Brak plików w tym pokoju.</p>
            ) : (
              attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href="#"
                  onClick={async (event) => {
                    event.preventDefault();
                    const response = await fetch(`/api/chat/attachments/${attachment.id}/signed-url`, {
                      credentials: "include",
                    });
                    const data = await response.json().catch(() => null);
                    if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground/80 hover:bg-surface-muted"
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">{attachment.fileName}</span>
                </a>
              ))
            )}
          </div>
        ) : null}

        {tab === "pins" ? (
          <div className="flex flex-col gap-1">
            {pins.length === 0 ? (
              <p className="text-xs text-muted">Brak przypiętych wiadomości.</p>
            ) : (
              pins.map((pin) => {
                const message = messages.find((m) => m.id === pin.messageId);
                return (
                  <div key={pin.id} className="rounded-lg border border-border/50 px-2 py-1.5 text-xs">
                    <Pin className="mb-1 h-3 w-3 text-accent" />
                    <p className="truncate text-foreground/80">{message?.body ?? "Wiadomość"}</p>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {inviteOpen ? (
        <ChatInviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          roomId={room.id}
          onInvited={() => void loadRoomDetail(room.id)}
        />
      ) : null}
    </div>
  );
}
