"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { VizDashboardConfigForm } from "@/components/viz/viz-dashboard-config-form";
import { VizAlarmRulesConfig } from "@/components/viz/viz-alarm-rules-config";
import { VizDashboardAccessConfig } from "@/components/viz/viz-dashboard-access-config";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import type { VizDashboard } from "@/lib/viz/types";

export default function VizDashboardConfigPage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<VizDashboard | null>(null);

  useEffect(() => {
    void params.then((p) => setDashboardId(p.dashboardId));
  }, [params]);

  useEffect(() => {
    if (!dashboardId) return;
    async function load() {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}`);
      if (response.ok) {
        const data = (await response.json()) as { dashboard: VizDashboard };
        setDashboard(data.dashboard);
      }
    }
    void load();
  }, [dashboardId]);

  if (!dashboardId) {
    return null;
  }

  return (
    <VizDashboardLayout dashboardId={dashboardId}>
      <PageHeader
        title="Konfiguracja dashboardu"
        description="Nazwa, status publikacji, klient i przypisane projekty."
      />
      {dashboard ? (
        <div className="space-y-6">
          <VizDashboardConfigForm dashboard={dashboard} />
          <div>
            <h2 className="mb-3 text-base font-semibold">Reguły alarmów i progów</h2>
            <VizAlarmRulesConfig dashboardId={dashboardId} />
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold">Dostęp użytkowników</h2>
            <VizDashboardAccessConfig dashboardId={dashboardId} />
          </div>
        </div>
      ) : null}
    </VizDashboardLayout>
  );
}
