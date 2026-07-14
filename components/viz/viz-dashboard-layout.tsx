"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { VizDashboardNav } from "@/components/viz/viz-dashboard-nav";
import type { VizDashboard } from "@/lib/viz/types";
import { useVizDashboardCacheStore } from "@/store/viz-dashboard-cache-store";
import { useVizStore } from "@/store/viz-store";

type VizDashboardLayoutProps = {
  dashboardId: string;
  children: React.ReactNode;
};

export function VizDashboardLayout({ dashboardId, children }: VizDashboardLayoutProps) {
  const cached = useVizStore((s) => s.getDashboardById(dashboardId));
  const hydrated = useVizStore((s) => s.hydrated);
  const hydrate = useVizStore((s) => s.hydrate);
  const session = useVizDashboardCacheStore((s) => s.getSession(dashboardId));
  const ensureSession = useVizDashboardCacheStore((s) => s.ensureSession);
  const [dashboard, setDashboard] = useState<VizDashboard | null>(cached ?? null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (cached) {
      setDashboard(cached);
      setIsLoadingDashboard(false);
    }
  }, [cached]);

  useEffect(() => {
    void ensureSession(dashboardId);
  }, [dashboardId, ensureSession]);

  useEffect(() => {
    if (cached) {
      return;
    }

    async function loadDashboard() {
      setIsLoadingDashboard(true);
      setError(null);
      try {
        const response = await fetch(`/api/viz/dashboards/${dashboardId}`);
        if (!response.ok) {
          throw new Error("Dashboard nie istnieje lub brak dostępu.");
        }
        const data = (await response.json()) as { dashboard: VizDashboard };
        setDashboard(data.dashboard);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setIsLoadingDashboard(false);
      }
    }

    if (hydrated || !cached) {
      void loadDashboard();
    }
  }, [cached, dashboardId, hydrated]);

  if (isLoadingDashboard && !dashboard) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Ładowanie dashboardu…
      </div>
    );
  }

  if (error || !dashboard) {
    return <p className="py-8 text-sm text-rose-300">{error ?? "Dashboard nie istnieje."}</p>;
  }

  return (
    <div>
      <VizDashboardNav
        dashboardId={dashboard.id}
        dashboardName={dashboard.name}
        permissions={session?.permissions}
        canManage={session?.canManage ?? true}
      />
      {children}
    </div>
  );
}
