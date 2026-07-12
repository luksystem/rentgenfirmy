"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useMyWorkStore } from "@/store/my-work-store";

/** Prefetch zadań użytkownika w tle po starcie aplikacji. */
export function MyWorkHydrator({ children }: { children: React.ReactNode }) {
  const profileId = useAuthStore((state) => state.profile?.id);
  const ensureMyItems = useMyWorkStore((state) => state.ensureMyItems);

  useEffect(() => {
    if (profileId) {
      void ensureMyItems();
    }
  }, [profileId, ensureMyItems]);

  return <>{children}</>;
}
