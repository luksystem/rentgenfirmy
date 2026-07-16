"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";

/** Globalnie tylko hub (metadane). Pełne grafy tablic — na trasach zbiorczych / ensureBoard. */
export function KanbanCacheHydrator({ children }: { children: React.ReactNode }) {
  const hydrateHub = useKanbanCacheStore((state) => state.hydrateHub);
  const hubHydrated = useKanbanCacheStore((state) => state.hubHydrated);

  useEffect(() => {
    if (!isSupabaseConfigured() || hubHydrated) {
      return;
    }

    void hydrateHub().catch(() => undefined);
  }, [hydrateHub, hubHydrated]);

  return <>{children}</>;
}
