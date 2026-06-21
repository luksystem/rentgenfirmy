"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardStore } from "@/store/dashboard-store";

export function DashboardHydrator({ children }: { children: React.ReactNode }) {
  const projects = useAppStore((state) => state.projects);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const hydrated = useDashboardStore((state) => state.hydrated);
  const hydrate = useDashboardStore((state) => state.hydrate);

  useEffect(() => {
    if (!isSupabaseConfigured() || !isInitialized || hydrated) {
      return;
    }

    void hydrate({
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
      })),
      profileId: profile?.id ?? null,
      displayName: displayName || profile?.email || "Pracownik",
    }).catch(() => undefined);
  }, [displayName, hydrate, hydrated, isInitialized, profile?.email, profile?.id, projects]);

  return <>{children}</>;
}
