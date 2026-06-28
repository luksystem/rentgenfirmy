"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 10_000;

export function useNotificationsRealtime(profileId: string | undefined, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!profileId || !isSupabaseConfigured()) {
      return;
    }

    const refresh = () => {
      onRefreshRef.current();
    };

    refresh();

    const supabase = getSupabase();
    const channelName = `user-notifications-${profileId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [profileId]);
}
