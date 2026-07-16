"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 30_000;

type RefreshMode = "light" | "full";

/**
 * Realtime + okresowy poll. Poll i eventy DB → light; focus/visibility → full.
 * onRefresh(mode) pozwala ograniczyć fan-out ciężkich store’ów.
 */
export function useNotificationsRealtime(
  profileId: string | undefined,
  onRefresh: (mode?: RefreshMode) => void,
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!profileId || !isSupabaseConfigured()) {
      return;
    }

    const refresh = (mode: RefreshMode = "full") => {
      onRefreshRef.current(mode);
    };

    refresh("full");

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
          refresh("light");
        },
      )
      .subscribe();

    const intervalId = window.setInterval(() => refresh("light"), POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh("full");
      }
    }

    function handleFocus() {
      refresh("full");
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [profileId]);
}
