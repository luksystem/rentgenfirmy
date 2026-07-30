"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export function ProcessHydrator({ children }: { children: React.ReactNode }) {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const hydrate = useProcessStore((state) => state.hydrate);
  const hydrated = useProcessStore((state) => state.hydrated);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isInitialized || hydrated) {
      return;
    }
    void hydrate();
  }, [hydrate, hydrated, isInitialized]);

  return <>{children}</>;
}
