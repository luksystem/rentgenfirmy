"use client";

import { MyWorkManagerDashboard } from "@/components/my-work/my-work-manager-dashboard";
import { useAuthStore } from "@/store/auth-store";
import { useCanManageWorkItems } from "@/store/my-work-store";

export default function MyWorkDashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const canManage = useCanManageWorkItems(profile?.role);

  if (!canManage) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        Pulpit managera jest dostępny tylko dla managera lub administratora.
      </div>
    );
  }

  return <MyWorkManagerDashboard />;
}
