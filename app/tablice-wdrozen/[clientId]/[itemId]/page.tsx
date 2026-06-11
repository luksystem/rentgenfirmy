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
import type { KanbanHubBoardEntry } from "@/lib/process/kanban-hub-types";
import {
  fetchKanbanHubBoardEntry,
  fetchKanbanHubClientBoards,
} from "@/lib/supabase/kanban-hub-repository";
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

  const [boardEntry, setBoardEntry] = useState<KanbanHubBoardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
      setError(null);
      try {
        const [entry, clientBoards] = await Promise.all([
          fetchKanbanHubBoardEntry(projectProcessItemId),
          fetchKanbanHubClientBoards(clientId),
        ]);

        if (!entry) {
          setError("Nie znaleziono tablicy Kanban.");
          setBoardEntry(null);
          return;
        }

        const belongsToClient = clientBoards.some(
          (board) => board.projectProcessItemId === projectProcessItemId,
        );
        if (!belongsToClient) {
          setError("Ta tablica nie należy do wybranego klienta.");
          setBoardEntry(null);
          return;
        }

        setBoardEntry(entry);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectProcessItemId, clientId]);

  const templatePayload = isKanbanTemplatePayload(templateItem?.defaultPayload)
    ? templateItem.defaultPayload
    : { columns: [] };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
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
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface p-4">
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
