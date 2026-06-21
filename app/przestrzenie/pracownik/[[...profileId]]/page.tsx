"use client";

import { useParams } from "next/navigation";
import {
  DashboardPlaceholderBody,
  DashboardSpaceShell,
} from "@/components/dashboard/dashboard-space-shell";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardStore } from "@/store/dashboard-store";

export default function EmployeeDashboardPage() {
  const params = useParams();
  const profileId = params.profileId ? String(params.profileId) : null;
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const getEmployeeSpace = useDashboardStore((state) => state.getEmployeeSpace);

  const effectiveProfileId = profileId ?? profile?.id ?? null;
  const space = effectiveProfileId ? getEmployeeSpace(effectiveProfileId) : null;

  return (
    <DashboardSpaceShell
      kind="employee"
      title={displayName || "Przestrzeń pracownika"}
      backHref="/przestrzenie"
    >
      <DashboardPlaceholderBody
        bullets={[
          "Osobiste zadania i notatki",
          "Skróty do projektów i tablic",
          space ? "Przestrzeń pracownika utworzona" : "Przestrzeń zostanie utworzona automatycznie",
        ]}
      />
    </DashboardSpaceShell>
  );
}
