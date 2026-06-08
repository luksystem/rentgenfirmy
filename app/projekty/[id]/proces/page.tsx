"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProcessProgress } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useProcessStore } from "@/store/process-store";

export default function ProjectProcessPage() {
  const params = useParams();
  const projectId = String(params.id);

  const project = useAppStore((state) =>
    state.projects.find((entry) => entry.id === projectId),
  );
  const isInitialized = useAppStore((state) => state.isInitialized);
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const processError = useProcessStore((state) => state.error);

  const hydrate = useProcessStore((state) => state.hydrate);
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const toggleItemCompletion = useProcessStore((state) => state.toggleItemCompletion);
  const displayName = useAuthStore((state) => state.displayName);

  const template = useProcessStore((state) =>
    project ? state.templates.find((entry) => entry.projectType === project.type) : undefined,
  );
  const process = useProcessStore((state) => state.projectProcesses[projectId]);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    void (async () => {
      try {
        await hydrate(projectTypes);
        await ensureProjectProcess(project.id, project.type);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Błąd ładowania procesu.");
      } finally {
        setReady(true);
      }
    })();
  }, [ensureProjectProcess, hydrate, project, projectTypes]);

  if (!isInitialized) {
    return <p className="text-sm text-muted">Ładowanie projektu…</p>;
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie znaleziono projektu.</p>
          <Button asChild>
            <Link href="/projekty">Wróć do projektów</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progress =
    template && process ? getProcessProgress(template, process) : null;

  return (
    <>
      <PageHeader
        eyebrow="Proces projektu"
        title={project.name}
        description={`Typ: ${project.type}${progress ? ` · postęp ${progress.completed}/${progress.total} (${progress.percent}%)` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/projekty">Lista projektów</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/procesy/${encodeURIComponent(project.type)}`}>Szablon procesu</Link>
            </Button>
          </div>
        }
      />

      {loadError || processError ? (
        <Card className="mb-4 border-rose-500/30">
          <CardContent className="grid gap-2 py-4 text-sm text-rose-300">
            <p>{loadError ?? processError}</p>
            <p className="text-muted">
              Jeśli to pierwsze uruchomienie modułu, uruchom migracje{" "}
              <code className="rounded bg-surface-muted px-1 text-foreground">015_processes.sql</code>{" "}
              i{" "}
              <code className="rounded bg-surface-muted px-1 text-foreground">016_process_milestone_planned_date.sql</code>{" "}
              w Supabase.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!ready || !template || !process ? (
        <p className="text-sm text-muted">Ładowanie pipeline procesu…</p>
      ) : (
        <Card>
          <CardContent className="py-5">
            <ProcessPipeline
              template={template}
              process={process}
              interactive
              onToggleItem={(itemId, completed) =>
                void toggleItemCompletion(project.id, itemId, completed, displayName || undefined)
              }
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
