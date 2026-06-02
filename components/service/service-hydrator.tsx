"use client";

import { useEffect } from "react";
import { useServiceStore } from "@/store/service-store";

export function ServiceHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useServiceStore((state) => state.hydrate);
  const hydrated = useServiceStore((state) => state.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">
        Ładowanie modułu serwisu...
      </div>
    );
  }

  return children;
}
