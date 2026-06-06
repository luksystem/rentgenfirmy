"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWorkOrderStore } from "@/store/work-order-store";

export function WorkOrderHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useWorkOrderStore((state) => state.hydrate);
  const hydrated = useWorkOrderStore((state) => state.hydrated);
  const isLoading = useWorkOrderStore((state) => state.isLoading);
  const error = useWorkOrderStore((state) => state.error);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading && !hydrated) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">
        Ładowanie modułu zleceń...
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
