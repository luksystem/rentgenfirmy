"use client";

import { useEffect } from "react";
import { useVizStore } from "@/store/viz-store";

export function VizHydrator({ children }: { children?: React.ReactNode }) {
  const hydrate = useVizStore((state) => state.hydrate);
  const hydrated = useVizStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      void hydrate();
    }
  }, [hydrate, hydrated]);

  return children ? <>{children}</> : null;
}
