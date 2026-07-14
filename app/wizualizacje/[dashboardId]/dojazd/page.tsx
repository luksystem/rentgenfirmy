"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import { VizTravelCalculator } from "@/components/viz/viz-travel-calculator";

export default function VizTravelCalculatorPage({
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
        title="Kalkulator dojazdu"
        description="Niezależny kalkulator kosztu wyjazdu serwisowego z własnymi snapshotami."
      />
      <VizTravelCalculator dashboardId={dashboardId} />
    </VizDashboardLayout>
  );
}
