"use client";

import {
  DashboardPlaceholderBody,
  DashboardSpaceShell,
} from "@/components/dashboard/dashboard-space-shell";
import { useDashboardStore } from "@/store/dashboard-store";

export default function ManagerDashboardPage() {
  const space = useDashboardStore((state) => state.getGlobalSpace("manager"));

  return (
    <DashboardSpaceShell kind="manager" backHref="/przestrzenie">
      <DashboardPlaceholderBody
        bullets={[
          "Przegląd projektów i terminów",
          "Eskalacje i blokery",
          space ? "Przestrzeń globalna utworzona" : "Przestrzeń zostanie utworzona automatycznie",
        ]}
      />
    </DashboardSpaceShell>
  );
}
