"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="grid gap-3 py-8 text-sm">
            <p className="font-medium text-rose-200">Nie udało się wyświetlić dashboardu klienta.</p>
            <p className="text-muted">
              {error.message || "Wystąpił nieoczekiwany błąd po stronie przeglądarki."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="w-fit rounded-xl border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted/30"
            >
              Spróbuj ponownie
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
