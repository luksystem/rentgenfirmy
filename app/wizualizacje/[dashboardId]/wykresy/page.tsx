"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";

export default function VizChartsConfigPage({
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
        title="Konfiguracja wykresów"
        description="Tworzenie wykresów liniowych, obszarowych i porównawczych bez edycji kodu."
      />
      <Card className="p-6 text-sm text-muted">
        Konfigurator wykresów zostanie udostępniony w Etapie 3 (wykres pojedynczego sklepu i
        porównawczy wielu sklepów).
      </Card>
    </VizDashboardLayout>
  );
}
