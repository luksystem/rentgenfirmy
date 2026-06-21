"use client";

import {
  DashboardPlaceholderBody,
  DashboardSpaceShell,
} from "@/components/dashboard/dashboard-space-shell";
import { useDashboardStore } from "@/store/dashboard-store";

export default function InstallerDashboardPage() {
  const space = useDashboardStore((state) => state.getGlobalSpace("installer"));

  return (
    <DashboardSpaceShell kind="installer" backHref="/przestrzenie">
      <DashboardPlaceholderBody
        bullets={[
          "Harmonogram montaży i zleceń terenowych",
          "Protokoły odbioru i checklisty",
          space ? "Przestrzeń globalna utworzona" : "Przestrzeń zostanie utworzona automatycznie",
        ]}
      />
    </DashboardSpaceShell>
  );
}
