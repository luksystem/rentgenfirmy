"use client";

import { useEffect, useState } from "react";
import { ProcessInternalAcceptanceBoard } from "@/components/process/process-internal-acceptance-board";
import type { PublicProcessItemPayload } from "@/lib/supabase/process-public-server";

export default function PublicInternalAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [item, setItem] = useState<PublicProcessItemPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ token: routeToken }) => setToken(routeToken));
  }, [params]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/odbior/${token}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Link wygasł lub tablica nie jest publiczna.");
        }
        return response.json() as Promise<{ item: PublicProcessItemPayload }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setItem(payload.item);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-rose-400">{error}</p>
      </main>
    );
  }

  if (!item || !token) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-muted">Ładowanie tablicy odbioru…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 py-6">
      <header className="mb-4 shrink-0">
        <p className="text-xs uppercase tracking-wide text-muted">Odbiór wewnętrzny</p>
        <h1 className="text-2xl font-semibold text-foreground">{item.title}</h1>
      </header>
      <ProcessInternalAcceptanceBoard
        projectId={item.projectId}
        templateItemId={item.templateItemId}
        initialState={item.internalAcceptance ?? undefined}
        actorName="Gość"
        publicToken={token}
      />
    </main>
  );
}
