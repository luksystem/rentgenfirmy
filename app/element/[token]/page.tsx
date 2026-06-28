"use client";

import { useEffect, useState } from "react";
import { ProcessChecklistEditor } from "@/components/process/process-checklist-editor";
import type { PublicProcessItemPayload } from "@/lib/supabase/process-public-server";

export default function PublicProcessElementPage({
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
    void fetch(`/api/element/${token}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Link wygasł lub element nie jest publiczny.");
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-rose-400">{error}</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Ładowanie elementu…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-muted">Element procesu — podgląd publiczny</p>
        <h1 className="text-2xl font-semibold text-foreground">{item.title}</h1>
      </header>
      {item.kind === "checklist" && item.checklist ? (
        <ProcessChecklistEditor
          initialPayload={item.checklist}
          actorName="Gość"
          canCustomizeStructure={false}
          onSave={async () => {
            /* zapis publiczny — kolejna faza */
          }}
        />
      ) : (
        <p className="text-sm text-muted">Ten typ elementu nie ma jeszcze publicznego widoku interaktywnego.</p>
      )}
    </main>
  );
}
