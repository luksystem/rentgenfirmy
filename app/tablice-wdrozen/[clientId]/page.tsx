"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { filterHubEntriesByClient, useKanbanCacheStore } from "@/store/kanban-cache-store";
import { useAppStore } from "@/store/app-store";

export default function KanbanHubClientPage() {
  const params = useParams();
  const clientId = String(params.clientId);
  const clients = useAppStore((state) => state.clients);
  const hubEntries = useKanbanCacheStore((state) => state.hubEntries);
  const hubLoading = useKanbanCacheStore((state) => state.hubLoading);
  const hydrateHub = useKanbanCacheStore((state) => state.hydrateHub);
  const [error, setError] = useState<string | null>(null);

  const boards = useMemo(
    () => filterHubEntriesByClient(hubEntries, clientId),
    [hubEntries, clientId],
  );
  const loading = hubLoading && !hubEntries;

  const clientName = useMemo(() => {
    if (clientId === "__none__") {
      return "Bez klienta";
    }
    return clients.find((client) => client.id === clientId)?.fullName ?? "Klient";
  }, [clientId, clients]);

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await hydrateHub();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablic klienta.");
      }
    })();
  }, [hydrateHub]);

  return (
    <>
      <PageHeader
        eyebrow="Tablice wdrożeń"
        title={clientName}
        description="Tablice Kanban powiązane z projektami tego klienta."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tablice-wdrozen">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wszyscy klienci
            </Link>
          </Button>
        }
      />

      {loading ? <p className="text-sm text-muted">Ładowanie tablic…</p> : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && boards.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted">
            Ten klient nie ma jeszcze tablic Kanban w aktywnych projektach.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {boards.map((board) => (
          <Link
            key={board.projectProcessItemId}
            href={`/tablice-wdrozen/${clientId}/${board.projectProcessItemId}`}
          >
            <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span className="line-clamp-2">{board.projectName}</span>
                  <LayoutGrid className="h-4 w-4 shrink-0 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted">
                <p>Typ: {board.projectType}</p>
                <p className="font-medium text-foreground">
                  {board.openTaskCount} otwartych zgłoszeń
                  {board.newTaskCount > 0 ? (
                    <span className="ml-2 inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {board.newTaskCount} nowe
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
