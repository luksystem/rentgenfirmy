"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import { VizProjectsVariablesConfig } from "@/components/viz/viz-projects-variables-config";

export default function VizProjectsConfigPage({
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
      <PageHeader
        title="Projekty i zmienne"
        description="Przypisz integracje projektu do ról semantycznych BMS (temperatura, setpoint, energia…)."
      />
      <VizProjectsVariablesConfig dashboardId={dashboardId} />
    </VizDashboardLayout>
  );
}
