"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useChatPresenceStore } from "@/store/chat-presence-store";

const CLEAR_INTERVAL_MS = 2000;
const THROTTLE_MS = 2500;

/** Wskaźnik "pisze..." — bez tabeli, kanał Broadcast per pokój (nie Realtime na DB). */
export function useChatTypingPresence(roomId: string | null, profileId: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const setTyping = useChatPresenceStore((state) => state.setTyping);

  useEffect(() => {
    if (!roomId || !profileId || !isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();
    const channel = supabase.channel(`chat-typing-${roomId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = (payload.payload as { profileId?: string } | undefined)?.profileId;
        if (senderId) {
          setTyping(roomId, senderId);
        }
      })
      .subscribe();
    channelRef.current = channel;

    const intervalId = window.setInterval(() => useChatPresenceStore.getState().clearStale(), CLEAR_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, profileId, setTyping]);

  function notifyTyping() {
    const now = Date.now();
    if (!channelRef.current || !profileId || now - lastSentRef.current < THROTTLE_MS) {
      return;
    }
    lastSentRef.current = now;
    void channelRef.current.send({ type: "broadcast", event: "typing", payload: { profileId } });
  }

  return { notifyTyping };
}
