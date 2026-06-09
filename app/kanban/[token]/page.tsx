"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PublicKanbanHeader } from "@/components/process/public-kanban-header";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicKanbanBoard } from "@/components/process/public-kanban-board";
import type { KanbanBoard, KanbanPublicContext } from "@/lib/process/kanban-types";

const DEFAULT_CONTEXT: KanbanPublicContext = {
  projectName: "Projekt",
  clientName: null,
};

export default function PublicKanbanPage() {
  const params = useParams();
  const token = String(params.token);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [context, setContext] = useState<KanbanPublicContext>(DEFAULT_CONTEXT);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/kanban/${encodeURIComponent(token)}`);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie znaleziono tablicy.");
    }
    const payload = (await response.json()) as { board: KanbanBoard; context?: KanbanPublicContext };
    setBoard(payload.board);
    if (payload.context) {
      setContext(payload.context);
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background via-background to-accent/5 p-6">
        <p className="text-sm text-muted">Ładowanie tablicy…</p>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background via-background to-accent/5 p-4 sm:p-6">
        <Card className="mx-auto max-w-md border-rose-500/20">
          <CardContent className="py-8 text-sm text-rose-300">{error ?? "Tablica niedostępna."}</CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-accent/5 px-4 py-6 sm:px-6">
        <div className="mx-auto grid w-full max-w-md flex-1 content-center gap-5">
          <PublicKanbanHeader context={context} />
          <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-5 shadow-soft backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-muted">
              Podaj imię lub nazwę firmy, aby dodawać zgłoszenia, komentować i przenosić je między etapami.
            </p>
            <div className="mt-4 grid gap-3">
              <Field label="Twoje imię / firma">
                <Input
                  value={authorName}
                  placeholder="np. Jan Kowalski"
                  className="h-11"
                  onChange={(event) => setAuthorName(event.target.value)}
                />
              </Field>
              <Button type="button" className="h-11 w-full" disabled={!authorName.trim()} onClick={() => setStarted(true)}>
                Wejdź na tablicę
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-accent/5">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6 sm:py-6">
        <PublicKanbanHeader context={context} compact />
        <PublicKanbanBoard token={token} board={board} authorName={authorName.trim()} onRefresh={refresh} />
      </div>
    </div>
  );
}
