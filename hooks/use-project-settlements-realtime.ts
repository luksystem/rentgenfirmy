"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const PROJECT_FILTERED_TABLES = [
  "project_settlement_entries",
  "project_billing_settings",
  "project_contract_quotas",
  "project_hourly_reports",
] as const;

/** Odświeża rozliczenia (kwoty, salda) po zmianach w ledgerze — zespół i publiczny dashboard klienta. */
export function useProjectSettlementsRealtime(
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
    let channel = supabase.channel(`project-settlements-sync-${projectId}`);

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

    channel.subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [options?.enabled, projectId]);
}
