"use client";

import { Hash, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ChatRoom } from "@/lib/chat/types";

type ChatRoomListProps = {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  unreadByRoom: Record<string, number>;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom?: () => void;
};

function roomIcon(kind: ChatRoom["kind"]) {
  if (kind === "client") {
    return <Users className="h-4 w-4" />;
  }
  return <Hash className="h-4 w-4" />;
}

export function ChatRoomList({ rooms, activeRoomId, unreadByRoom, onSelectRoom, onCreateRoom }: ChatRoomListProps) {
  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Pokoje</span>
        {onCreateRoom ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCreateRoom} title="Nowy pokój">
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {rooms.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted">Brak pokoi.</p>
        ) : (
          rooms.map((room) => {
            const unread = unreadByRoom[room.id] ?? 0;
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition",
                  isActive ? "bg-accent/10 text-accent" : "text-foreground/85 hover:bg-surface-muted",
                )}
              >
                <span className={cn("shrink-0", isActive ? "text-accent" : "text-muted")}>{roomIcon(room.kind)}</span>
                <span className="min-w-0 flex-1 truncate">{room.name}</span>
                {unread > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
