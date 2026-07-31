"use client";

import { useEffect, useMemo } from "react";
import { HomeWidgetGrid } from "@/components/home/home-widget-grid";
import { DefaultHomeView } from "@/components/home/default-home-view";
import { PageHeader } from "@/components/page-header";
import { resolveHomeWidgetIds } from "@/lib/home-widgets/registry";
import { useAuthStore } from "@/store/auth-store";
import { useRoleNavPermissionsStore } from "@/store/role-nav-permissions-store";

const WIDGET_ROLES = new Set(["administrator", "manager", "instalator"]);

export default function Home() {
  const profile = useAuthStore((state) => state.profile);
  const navConfig = useRoleNavPermissionsStore((state) => state.config);
  const hydrateNavConfig = useRoleNavPermissionsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateNavConfig();
  }, [hydrateNavConfig]);

  const widgetIds = useMemo(
    () => (profile ? resolveHomeWidgetIds(profile.role, profile.homeWidgets, navConfig) : []),
    [profile, navConfig],
  );

  if (!profile || !WIDGET_ROLES.has(profile.role)) {
    return <DefaultHomeView />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Centrum operacyjne"
        title="Start"
        description="Widżety wybrane w Ustawieniach konta. Możesz je zmienić w każdej chwili."
      />
      <HomeWidgetGrid widgetIds={widgetIds} />
    </>
  );
}
