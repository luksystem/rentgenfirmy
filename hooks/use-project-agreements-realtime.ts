"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

const REALTIME_TABLES = [
  "project_client_agreements",
  "project_agreement_approvals",
  "project_agreement_comments",
  "project_agreement_versions",
  "project_agreement_attachments",
] as const;

export function useProjectAgreementsRealtime(
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
    let channel = supabase.channel(`project-agreements-sync-${projectId}`);

    for (const table of REALTIME_TABLES) {
      if (table === "project_client_agreements") {
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
      } else {
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
