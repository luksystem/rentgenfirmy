"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { VizDashboardNav } from "@/components/viz/viz-dashboard-nav";
import type { VizDashboard, VizDashboardPermissions } from "@/lib/viz/types";
import { useVizStore } from "@/store/viz-store";

type VizDashboardLayoutProps = {
  dashboardId: string;
  children: React.ReactNode;
};

type DashboardSession = {
  permissions: VizDashboardPermissions;
  canManage: boolean;
};

export function VizDashboardLayout({ dashboardId, children }: VizDashboardLayoutProps) {
  const cached = useVizStore((s) => s.getDashboardById(dashboardId));
  const hydrate = useVizStore((s) => s.hydrate);
  const [dashboard, setDashboard] = useState<VizDashboard | null>(cached ?? null);
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (cached) {
      setDashboard(cached);
      setIsLoading(false);
    }

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [dashboardRes, sessionRes] = await Promise.all([
          cached ? Promise.resolve(null) : fetch(`/api/viz/dashboards/${dashboardId}`),
          fetch(`/api/viz/dashboards/${dashboardId}/session`),
        ]);

        if (!cached) {
          if (!dashboardRes?.ok) {
            throw new Error("Dashboard nie istnieje lub brak dostępu.");
          }
          const data = (await dashboardRes.json()) as { dashboard: VizDashboard };
          setDashboard(data.dashboard);
        }

        if (!sessionRes.ok) {
          throw new Error("Brak dostępu do dashboardu.");
        }
        const sessionData = (await sessionRes.json()) as DashboardSession;
        setSession(sessionData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [cached, dashboardId]);

  if (isLoading) {
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
        canManage={session?.canManage}
      />
      {children}
    </div>
  );
}
