"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function useProjectChangeRequestsRealtime(
  projectId: string | undefined,
  onRefresh: () => void,
  options?: { enabled?: boolean },
) {
  const onRefreshRef = useRef(onRefresh);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const enabled = options?.enabled ?? true;
    if (!projectId || !enabled || !isSupabaseConfigured()) {
      return;
    }

    const scheduleRefresh = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onRefreshRef.current();
      }, 250);
    };

    const supabase = getSupabase();
    const channel = supabase.channel(`project-change-requests-sync-${projectId}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "project_change_requests",
        filter: `project_id=eq.${projectId}`,
      },
      scheduleRefresh,
    );

    channel.subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [options?.enabled, projectId]);
}
