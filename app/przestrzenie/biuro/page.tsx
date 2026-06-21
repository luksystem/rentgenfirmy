"use client";

import {
  DashboardPlaceholderBody,
  DashboardSpaceShell,
} from "@/components/dashboard/dashboard-space-shell";
import { useDashboardStore } from "@/store/dashboard-store";

export default function OfficeDashboardPage() {
  const space = useDashboardStore((state) => state.getGlobalSpace("office"));

  return (
    <DashboardSpaceShell kind="office" backHref="/przestrzenie">
      <DashboardPlaceholderBody
        bullets={[
          "Dokumenty, faktury i korespondencja",
          "Status rozliczeń serwisowych",
          space ? "Przestrzeń globalna utworzona" : "Przestrzeń zostanie utworzona automatycznie",
        ]}
      />
    </DashboardSpaceShell>
  );
}
