"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGoalStore } from "@/store/goal-store";

export function GoalHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useGoalStore((state) => state.hydrate);
  const hydrated = useGoalStore((state) => state.hydrated);
  const isLoading = useGoalStore((state) => state.isLoading);
  const error = useGoalStore((state) => state.error);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (isLoading && !hydrated) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">
        Ładowanie modułu Tablic celów...
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
