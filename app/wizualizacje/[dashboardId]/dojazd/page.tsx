"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";

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
        description="Niezależny kalkulator kosztu wyjazdu serwisowego z własnymi ustawieniami i snapshotami."
      />
      <Card className="p-6 text-sm text-muted">
        Kalkulator zostanie skopiowany ze Szybkich ofert (z testami porównawczymi) w Etapie 4.
        Lokalizacja docelowa będzie pobierana z klienta projektu.
      </Card>
    </VizDashboardLayout>
  );
}
