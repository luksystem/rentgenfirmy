"use client";

import {
  DashboardPlaceholderBody,
  DashboardSpaceShell,
} from "@/components/dashboard/dashboard-space-shell";
import { useDashboardStore } from "@/store/dashboard-store";

function GlobalDashboardPage({ kind }: { kind: "owner" | "manager" | "office" | "installer" }) {
  const getGlobalSpace = useDashboardStore((state) => state.getGlobalSpace);
  const space = getGlobalSpace(kind);

  return (
    <DashboardSpaceShell kind={kind} backHref="/przestrzenie">
      <DashboardPlaceholderBody
        bullets={[
          "Widżety i KPI dopasowane do roli",
          "Skróty do projektów, zleceń i alertów",
          space ? "Przestrzeń globalna utworzona" : "Przestrzeń zostanie utworzona automatycznie",
        ]}
      />
    </DashboardSpaceShell>
  );
}

export default function OwnerDashboardPage() {
  return <GlobalDashboardPage kind="owner" />;
}
