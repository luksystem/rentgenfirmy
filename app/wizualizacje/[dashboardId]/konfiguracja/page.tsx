"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { VizDashboardConfigForm } from "@/components/viz/viz-dashboard-config-form";
import { VizAlarmRulesConfig } from "@/components/viz/viz-alarm-rules-config";
import { VizDashboardAccessConfig } from "@/components/viz/viz-dashboard-access-config";
import { VizDashboardLayout } from "@/components/viz/viz-dashboard-layout";
import { VizScrollTabBar } from "@/components/viz/viz-scroll-tab-bar";
import type { VizDashboard } from "@/lib/viz/types";

const CONFIG_SECTIONS = [
  { id: "ustawienia", label: "Ustawienia i projekty" },
  { id: "alarmy", label: "Reguły alarmów" },
  { id: "dostep", label: "Dostęp użytkowników" },
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number]["id"];

function configSectionFromSlug(slug: string | null | undefined): ConfigSection {
  if (slug === "alarmy" || slug === "dostep") {
    return slug;
  }
  return "ustawienia";
}

export default function VizDashboardConfigPage({
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
        title="Konfiguracja dashboardu"
        description="Nazwa, status publikacji, klient, projekty, alarmy i dostęp użytkowników."
      />
      <Suspense fallback={<p className="text-sm text-muted">Ładowanie konfiguracji…</p>}>
        <VizDashboardConfigContent dashboardId={dashboardId} />
      </Suspense>
    </VizDashboardLayout>
  );
}

function VizDashboardConfigContent({ dashboardId }: { dashboardId: string }) {
  const searchParams = useSearchParams();
  const activeSection = configSectionFromSlug(searchParams.get("sekcja"));
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

  const tabItems = useMemo(
    () =>
      CONFIG_SECTIONS.map((section) => ({
        id: section.id,
        label: section.label,
        href: `/wizualizacje/${dashboardId}/konfiguracja?sekcja=${section.id}`,
      })),
    [dashboardId],
  );

  return (
    <div className="space-y-6">
      <VizScrollTabBar tabs={tabItems} activeId={activeSection} />

      {activeSection === "ustawienia" ? (
        dashboard ? (
          <VizDashboardConfigForm dashboard={dashboard} />
        ) : (
          <p className="text-sm text-muted">Ładowanie ustawień dashboardu…</p>
        )
      ) : null}

      {activeSection === "alarmy" ? (
        <div>
          <h2 className="mb-3 text-base font-semibold">Reguły alarmów i progów</h2>
          <VizAlarmRulesConfig dashboardId={dashboardId} />
        </div>
      ) : null}

      {activeSection === "dostep" ? (
        <div>
          <h2 className="mb-3 text-base font-semibold">Dostęp użytkowników</h2>
          <VizDashboardAccessConfig dashboardId={dashboardId} />
        </div>
      ) : null}
    </div>
  );
}
