"use client";

import { useEffect, useState } from "react";
import { VizDashboardCommandCenter } from "@/components/viz/viz-dashboard-command-center";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import type { VizDashboard } from "@/lib/viz/types";

export default function VizDashboardPage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const [dashboardId, setDashboardId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setDashboardId(p.dashboardId));
  }, [params]);

  if (!dashboardId) {
    return null;
  }

  return (
    <VizDashboardLayout dashboardId={dashboardId}>
      <DashboardHeader dashboardId={dashboardId} />
      <VizDashboardCommandCenter dashboardId={dashboardId} />
    </VizDashboardLayout>
  );
}

function DashboardHeader({ dashboardId }: { dashboardId: string }) {
  const [dashboard, setDashboard] = useState<VizDashboard | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}`);
      if (response.ok) {
        const data = (await response.json()) as { dashboard: VizDashboard };
        setDashboard(data.dashboard);
      }
    }
    void load();
  }, [dashboardId]);

  if (!dashboard) {
    return null;
  }

  return (
    <div className="mb-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {dashboard.templateName ?? "BMS Command Center"}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{dashboard.name}</h1>
      {dashboard.description ? (
        <p className="mt-2 max-w-3xl text-sm text-muted">{dashboard.description}</p>
      ) : null}
    </div>
  );
}
