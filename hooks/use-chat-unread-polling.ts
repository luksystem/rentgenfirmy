"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

export function useChatUnreadPolling(enabled: boolean) {
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/unread-counts", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { rooms?: { roomId: string; unreadCount: number }[] };
      const next: Record<string, number> = {};
      for (const room of data.rooms ?? []) {
        next[room.roomId] = room.unreadCount;
      }
      setUnreadByRoom(next);
    } catch {
      // ciche niepowodzenie — spróbuje ponownie w kolejnym cyklu
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    function handleFocus() {
      void refresh();
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, refresh]);

  return { unreadByRoom, refresh };
}
