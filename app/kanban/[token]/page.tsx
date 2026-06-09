"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicKanbanBoard } from "@/components/process/public-kanban-board";
import type { KanbanBoard } from "@/lib/process/kanban-types";

export default function PublicKanbanPage() {
  const params = useParams();
  const token = String(params.token);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
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
    const payload = (await response.json()) as { board: KanbanBoard };
    setBoard(payload.board);
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

  useEffect(() => {
    if (!started || !board?.id) {
      return;
    }
    const interval = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [board?.id, refresh, started]);

  if (!ready) {
    return <p className="p-6 text-sm text-muted">Ładowanie tablicy…</p>;
  }

  if (error || !board) {
    return (
      <Card className="m-6">
        <CardContent className="py-8 text-sm text-rose-300">{error ?? "Tablica niedostępna."}</CardContent>
      </Card>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto grid max-w-md gap-4 p-6">
        <h1 className="text-xl font-semibold text-foreground">Tablica optymalizacji</h1>
        <p className="text-sm text-muted">Podaj imię lub nazwę firmy, aby dodawać taski i komentarze.</p>
        <Field label="Twoje imię / firma">
          <Input value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
        </Field>
        <Button type="button" disabled={!authorName.trim()} onClick={() => setStarted(true)}>
          Wejdź na tablicę
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4 p-4 md:p-6">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Tablica optymalizacji Smart Home</h1>
        <p className="text-sm text-muted">Współpraca z zespołem — dodawaj zgłoszenia, komentuj i przesuwaj między kolumnami.</p>
      </div>
      <PublicKanbanBoard token={token} board={board} authorName={authorName.trim()} onRefresh={refresh} />
    </div>
  );
}
