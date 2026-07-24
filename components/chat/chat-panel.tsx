"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useChatUnreadPolling } from "@/hooks/use-chat-unread-polling";
import { ChatRoomList } from "@/components/chat/chat-room-list";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatRightPanel } from "@/components/chat/chat-right-panel";
import { ChatNewRoomDialog } from "@/components/chat/chat-new-room-dialog";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  /** Gdy podane — panel osadzony w przestrzeni projektu/klienta, ograniczony do jego pokoi. */
  projectId?: string;
  defaultRoomKind?: "main" | "client";
  /** Deep-link do konkretnego pokoju (np. z /czat/[roomId] lub powiadomienia). */
  initialRoomId?: string;
  /** Gdy true — brak pełnej wysokości ekranu (osadzenie w karcie/zakładce). */
  embedded?: boolean;
  className?: string;
};

export function ChatPanel({ projectId, defaultRoomKind, initialRoomId, embedded = false, className }: ChatPanelProps) {
  const profile = useAuthStore((state) => state.profile);
  const rooms = useChatStore((state) => state.rooms);
  const roomsLoaded = useChatStore((state) => state.roomsLoaded);
  const activeRoomId = useChatStore((state) => state.activeRoomId);
  const setActiveRoomId = useChatStore((state) => state.setActiveRoomId);
  const loadRooms = useChatStore((state) => state.loadRooms);

  const [showMobileRoomList, setShowMobileRoomList] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(!embedded);
  const [newRoomOpen, setNewRoomOpen] = useState(false);

  const { unreadByRoom, refresh: refreshUnread } = useChatUnreadPolling(Boolean(profile));

  useEffect(() => {
    void loadRooms(projectId ? { projectId } : undefined);
  }, [loadRooms, projectId]);

  useEffect(() => {
    if (!roomsLoaded || !initialRoomId) return;
    if (rooms.some((room) => room.id === initialRoomId)) {
      setActiveRoomId(initialRoomId);
    }
  }, [roomsLoaded, rooms, initialRoomId, setActiveRoomId]);

  useEffect(() => {
    if (!roomsLoaded || activeRoomId || initialRoomId || !rooms.length) return;
    const preferred = defaultRoomKind
      ? rooms.find((room) => room.kind === defaultRoomKind && (!projectId || room.projectId === projectId))
      : undefined;
    setActiveRoomId(preferred?.id ?? rooms[0].id);
  }, [roomsLoaded, activeRoomId, rooms, defaultRoomKind, projectId, initialRoomId, setActiveRoomId]);

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? null, [rooms, activeRoomId]);

  if (!profile) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full overflow-hidden rounded-2xl border border-border bg-surface-elevated",
        embedded ? "h-[70vh]" : "h-[calc(100dvh-6rem)]",
        className,
      )}
    >
      <div
        className={cn(
          "w-full shrink-0 border-r border-border/70 sm:w-72",
          showMobileRoomList ? "flex" : "hidden sm:flex",
        )}
      >
        <ChatRoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          unreadByRoom={unreadByRoom}
          onSelectRoom={(roomId) => {
            setActiveRoomId(roomId);
            setShowMobileRoomList(false);
          }}
          onCreateRoom={projectId ? () => setNewRoomOpen(true) : undefined}
        />
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", showMobileRoomList ? "hidden sm:flex" : "flex")}>
        {activeRoom ? (
          <ChatMessageList
            room={activeRoom}
            currentProfileId={profile.id}
            onBack={() => setShowMobileRoomList(true)}
            onToggleRightPanel={() => setShowRightPanel((value) => !value)}
            onMessageSent={refreshUnread}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            {roomsLoaded ? "Brak dostępnych pokoi." : "Wczytywanie…"}
          </div>
        )}
      </div>

      {activeRoom && showRightPanel ? (
        <div className="hidden w-72 shrink-0 border-l border-border/70 lg:flex">
          <ChatRightPanel room={activeRoom} currentProfileId={profile.id} />
        </div>
      ) : null}

      {projectId ? (
        <ChatNewRoomDialog
          open={newRoomOpen}
          onOpenChange={setNewRoomOpen}
          projectId={projectId}
          onCreated={(roomId) => {
            void loadRooms({ projectId }).then(() => setActiveRoomId(roomId));
          }}
        />
      ) : null}
    </div>
  );
}
