"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { VizContractsPanel } from "@/components/viz/viz-contracts-panel";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";

export default function VizContractsPage({
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
        title="Umowy serwisowe"
        description="Umowy sieciowe, budżety godzin, stawki wersjonowane i agregacja czasu pracy."
      />
      <VizContractsPanel dashboardId={dashboardId} />
    </VizDashboardLayout>
  );
}
