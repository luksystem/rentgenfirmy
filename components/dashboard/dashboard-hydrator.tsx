"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useDashboardStore } from "@/store/dashboard-store";

/** Boot: tylko lista istniejących przestrzeni. Ensure per projekt — przy wejściu w dashboard. */
export function DashboardHydrator({ children }: { children: React.ReactNode }) {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const hydrated = useDashboardStore((state) => state.hydrated);
  const hydrate = useDashboardStore((state) => state.hydrate);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isInitialized || hydrated) {
      return;
    }

    void hydrate().catch(() => undefined);
  }, [hydrate, hydrated, isInitialized]);

  return <>{children}</>;
}
