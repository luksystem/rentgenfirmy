"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const PROJECT_FILTERED_TABLES = [
  "project_trades",
  "project_agreement_fulfillments",
  "project_specification_fulfillments",
  "project_stage_satisfactions",
  "project_satisfaction_overviews",
  "project_functionality_surveys",
] as const;

const GLOBAL_TABLES = [
  "project_functionality_responses",
  "project_functionality_tasks",
] as const;

/** Odświeża dane dashboardu zespołu po zmianach klienta w publicznym linku (/przestrzen). */
export function useProjectDashboardRealtime(
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
    let channel = supabase.channel(`project-dashboard-sync-${projectId}`);

    for (const table of PROJECT_FILTERED_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `project_id=eq.${projectId}`,
        },
        scheduleRefresh,
      );
    }

    for (const table of GLOBAL_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [options?.enabled, projectId]);
}
