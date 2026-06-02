"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";

export function ServiceHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useServiceStore((state) => state.hydrate);
  const hydrated = useServiceStore((state) => state.hydrated);
  const isLoading = useServiceStore((state) => state.isLoading);
  const error = useServiceStore((state) => state.error);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading && !hydrated) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">
        Ładowanie modułu serwisu...
      </div>
    );
  }

  if (error && !hydrated) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-rose-400">{error}</p>
        <Button type="button" variant="secondary" onClick={() => hydrate()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (!hydrated) {
    return null;
  }

  return children;
}
