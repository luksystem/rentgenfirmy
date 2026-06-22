"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";

export function useNotificationsRealtime(profileId: string | undefined, onRefresh: () => void) {
  useEffect(() => {
    if (!profileId) {
      return;
    }

    const supabase = getSupabase();
    const channel = supabase
      .channel(`user-notifications-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          onRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onRefresh, profileId]);
}
