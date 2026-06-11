"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchKanbanHubClients } from "@/lib/supabase/kanban-hub-repository";
import type { KanbanHubClientTile } from "@/lib/process/kanban-hub-types";

export default function KanbanHubPage() {
  const [clients, setClients] = useState<KanbanHubClientTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        setClients(await fetchKanbanHubClients());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablic.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Kanban"
        title="Tablice wdrożeń"
        description="Skrót do tablic optymalizacji Smart Home — per klient, bez przechodzenia przez listę projektów."
      />

      {loading ? (
        <p className="text-sm text-muted">Ładowanie tablic…</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted">
            Brak tablic Kanban powiązanych z projektami. Dodaj element Kanban w szablonie procesu i
            uruchom proces na projekcie.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <Link key={client.clientId} href={`/tablice-wdrozen/${client.clientId}`}>
            <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span className="line-clamp-2">{client.clientName}</span>
                  <LayoutGrid className="h-4 w-4 shrink-0 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted">
                <p>
                  {client.projectCount}{" "}
                  {client.projectCount === 1 ? "projekt" : client.projectCount < 5 ? "projekty" : "projektów"}
                  {" · "}
                  {client.boardCount}{" "}
                  {client.boardCount === 1 ? "tablica" : client.boardCount < 5 ? "tablice" : "tablic"}
                </p>
                <p className="font-medium text-foreground">
                  {client.openTaskCount} otwartych zgłoszeń
                  {client.newTaskCount > 0 ? (
                    <span className="ml-2 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {client.newTaskCount} nowe
                    </span>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
