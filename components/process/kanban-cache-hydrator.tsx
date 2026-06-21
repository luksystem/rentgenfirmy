"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";

export function KanbanCacheHydrator({ children }: { children: React.ReactNode }) {
  const hydrateHub = useKanbanCacheStore((state) => state.hydrateHub);
  const ensureAllBoards = useKanbanCacheStore((state) => state.ensureAllBoards);
  const hubHydrated = useKanbanCacheStore((state) => state.hubHydrated);

  useEffect(() => {
    if (!isSupabaseConfigured() || hubHydrated) {
      return;
    }

    void hydrateHub()
      .then(() => ensureAllBoards())
      .catch(() => undefined);
  }, [ensureAllBoards, hydrateHub, hubHydrated]);

  return <>{children}</>;
}
