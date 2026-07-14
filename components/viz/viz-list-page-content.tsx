"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { VizDashboardList } from "@/components/viz/viz-dashboard-list";
import { useVizStore } from "@/store/viz-store";

export function VizListPageContent() {
  const hydrate = useVizStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <PageHeader
        eyebrow="Projekty"
        title="Wizualizacje"
        description="Konfigurowalne dashboardy BMS dla wybranych projektów — Command Center, mapy, telemetria i serwis."
      />
      <VizDashboardList />
    </>
  );
}
