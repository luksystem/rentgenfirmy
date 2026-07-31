"use client";

import { AdminHomeView } from "@/components/home/admin-home-view";
import { ManagerHomeView } from "@/components/home/manager-home-view";
import { DefaultHomeView } from "@/components/home/default-home-view";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const role = useAuthStore((state) => state.profile?.role);

  if (role === "administrator") {
    return <AdminHomeView />;
  }

  if (role === "manager") {
    return <ManagerHomeView />;
  }

  return <DefaultHomeView />;
}
