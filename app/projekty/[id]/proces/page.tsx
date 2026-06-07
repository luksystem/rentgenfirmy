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
  const getProjectById = useAppStore((state) => (id: string) =>
    state.projects.find((project) => project.id === id),
  );
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const hydrate = useProcessStore((state) => state.hydrate);
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);
  const getProjectProcess = useProcessStore((state) => state.getProjectProcess);
  const toggleItemCompletion = useProcessStore((state) => state.toggleItemCompletion);
  const displayName = useAuthStore((state) => state.displayName);

  const project = getProjectById(projectId);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    void (async () => {
      try {
        await hydrate(projectTypes);
        await ensureProjectProcess(project.id, project.type);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania procesu.");
      } finally {
        setReady(true);
      }
    })();
  }, [ensureProjectProcess, hydrate, project, projectTypes]);

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

  const template = getTemplateByProjectType(project.type);
  const process = getProjectProcess(project.id);
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

      {error ? (
        <Card className="mb-4 border-rose-500/30">
          <CardContent className="py-4 text-sm text-rose-300">{error}</CardContent>
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
