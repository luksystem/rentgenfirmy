"use client";

import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function useProjectAgreementsRealtime(
  projectId: string | undefined,
  onRefresh: () => void,
) {
  useEffect(() => {
    if (!projectId || !isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabase();
    const channel = supabase
      .channel(`project-agreements-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_client_agreements",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          onRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onRefresh, projectId]);
}
