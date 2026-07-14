"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import { VizStoreDetailTabs } from "@/components/viz/viz-store-detail-tabs";
import type { VizDashboardProject } from "@/lib/viz/types";

export default function VizStoreDetailPage({
  params,
}: {
  params: Promise<{ dashboardId: string; projectId: string }>;
}) {
  const [ids, setIds] = useState<{ dashboardId: string; projectId: string } | null>(null);
  const [project, setProject] = useState<VizDashboardProject | null>(null);

  useEffect(() => {
    void params.then((p) => setIds({ dashboardId: p.dashboardId, projectId: p.projectId }));
  }, [params]);

  useEffect(() => {
    if (!ids) return;
    const { dashboardId, projectId } = ids;
    async function load() {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=projects`,
      );
      if (response.ok) {
        const data = (await response.json()) as { projects: VizDashboardProject[] };
        setProject(data.projects.find((p) => p.projectId === projectId) ?? null);
      }
    }
    void load();
  }, [ids]);

  if (!ids) {
    return null;
  }

  return (
    <VizDashboardLayout dashboardId={ids.dashboardId}>
      <PageHeader
        title={project?.displayName ?? project?.projectName ?? "Szczegóły sklepu"}
        description={project?.clientAddress ?? "Lokalizacja z klienta projektu"}
      />

      <Card className="mb-4 p-4 text-sm">
        <Link href={`/wizualizacje/${ids.dashboardId}`} className="text-accent hover:underline">
          ← Powrót do dashboardu
        </Link>
      </Card>

      <VizStoreDetailTabs dashboardId={ids.dashboardId} project={project} />
    </VizDashboardLayout>
  );
}
