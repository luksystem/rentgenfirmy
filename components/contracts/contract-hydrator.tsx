"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/store/contract-store";

export function ContractHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useContractStore((state) => state.hydrate);
  const hydrated = useContractStore((state) => state.hydrated);
  const error = useContractStore((state) => state.error);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (error && !hydrated) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-rose-400">{error}</p>
        <Button type="button" variant="secondary" onClick={() => void hydrate()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
