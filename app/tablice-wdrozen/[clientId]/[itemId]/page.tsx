"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ProcessKanbanBoard } from "@/components/process/process-kanban-board";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { findProcessItemInTemplate } from "@/lib/process/template-lookup";
import { filterHubEntriesByClient, useKanbanCacheStore } from "@/store/kanban-cache-store";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

export default function KanbanHubBoardPage() {
  const params = useParams();
  const clientId = String(params.clientId);
  const projectProcessItemId = String(params.itemId);

  const clients = useAppStore((state) => state.clients);
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const displayName = useAuthStore((state) => state.displayName);

  const hydrate = useProcessStore((state) => state.hydrate);
  const templates = useProcessStore((state) => state.templates);
  const processHydrated = useProcessStore((state) => state.hydrated);

  const hubEntries = useKanbanCacheStore((state) => state.hubEntries);
  const hubLoading = useKanbanCacheStore((state) => state.hubLoading);
  const hydrateHub = useKanbanCacheStore((state) => state.hydrateHub);
  const getBoardEntry = useKanbanCacheStore((state) => state.getBoardEntry);

  const [error, setError] = useState<string | null>(null);

  const loading = hubLoading && !hubEntries;
  const boardEntry = getBoardEntry(projectProcessItemId);

  const clientName = useMemo(() => {
    if (clientId === "__none__") {
      return "Bez klienta";
    }
    return clients.find((client) => client.id === clientId)?.fullName ?? "Klient";
  }, [clientId, clients]);

  const templateItem = useMemo(() => {
    if (!boardEntry) {
      return undefined;
    }
    const template = templates.find((entry) => entry.projectType === boardEntry.projectType);
    return findProcessItemInTemplate(template, boardEntry.templateItemId);
  }, [boardEntry, templates]);

  useEffect(() => {
    void hydrate(projectTypes);
  }, [hydrate, projectTypes]);

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await hydrateHub();
        const entry = useKanbanCacheStore.getState().getBoardEntry(projectProcessItemId);
        if (!entry) {
          setError("Nie znaleziono tablicy Kanban.");
          return;
        }

        const clientBoards = filterHubEntriesByClient(
          useKanbanCacheStore.getState().hubEntries,
          clientId,
        );
        const belongsToClient = clientBoards.some(
          (board) => board.projectProcessItemId === projectProcessItemId,
        );
        if (!belongsToClient) {
          setError("Ta tablica nie należy do wybranego klienta.");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      }
    })();
  }, [projectProcessItemId, clientId, hydrateHub]);

  const templatePayload = isKanbanTemplatePayload(templateItem?.defaultPayload)
    ? templateItem.defaultPayload
    : { columns: [] };

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden md:min-h-[calc(100vh-8rem)]">
      <PageHeader
        eyebrow={clientName}
        title={boardEntry?.projectName ?? "Tablica Kanban"}
        description={boardEntry ? `Typ projektu: ${boardEntry.projectType}` : "Ładowanie…"}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/tablice-wdrozen/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tablice klienta
            </Link>
          </Button>
        }
      />

      {loading ? <p className="text-sm text-muted">Ładowanie tablicy…</p> : null}

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !error && boardEntry && processHydrated && templateItem ? (
        <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 md:min-h-0 md:flex-1 md:overflow-hidden">
          <ProcessKanbanBoard
            projectProcessItemId={boardEntry.projectProcessItemId}
            templatePayload={templatePayload}
            authorSide="team"
            authorName={displayName || "Zespół"}
            showPublicLink
          />
        </div>
      ) : null}

      {!loading && !error && boardEntry && processHydrated && !templateItem ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            Nie znaleziono elementu Kanban w szablonie procesu ({boardEntry.projectType}).
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
