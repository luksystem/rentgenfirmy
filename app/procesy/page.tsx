"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { countProcessItems } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcesyPage() {
  const router = useRouter();
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const templates = useProcessStore((state) => state.templates);
  const isLoading = useProcessStore((state) => state.isLoading);
  const error = useProcessStore((state) => state.error);
  const hydrate = useProcessStore((state) => state.hydrate);
  const ensureTemplateForProjectType = useProcessStore((state) => state.ensureTemplateForProjectType);
  const [creatingType, setCreatingType] = useState<string | null>(null);

  useEffect(() => {
    void hydrate(projectTypes);
  }, [hydrate, projectTypes]);

  async function handleCreateTemplate(projectType: string) {
    setCreatingType(projectType);
    try {
      await ensureTemplateForProjectType(projectType);
      router.push(`/procesy/${encodeURIComponent(projectType)}`);
    } finally {
      setCreatingType(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Procesy"
        description="Szablony pipeline per typ projektu, katalog elementów oraz typy (checklisty, protokoły, rozliczenia, Kanban)."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/procesy/typy">Typy elementów</Link>
            </Button>
            <Button asChild>
              <Link href="/procesy/elementy">Elementy procesu</Link>
            </Button>
          </div>
        }
      />

      {error ? (
        <Card className="mb-4 border-rose-500/30">
          <CardContent className="py-4 text-sm text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted">Ładowanie szablonów procesów…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectTypes.map((projectType) => {
            const template = templates.find((entry) => entry.projectType === projectType);
            const itemCount = template ? countProcessItems(template) : 0;
            const stageCount = template?.stages.length ?? 0;

            return (
              <Card key={projectType}>
                <CardContent className="grid gap-4 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      Typ projektu
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-foreground">{projectType}</h2>
                    <p className="mt-2 text-sm text-muted">
                      {template?.description ?? "Brak szablonu — utwórz go dla tego typu projektu."}
                    </p>
                  </div>
                  {template ? (
                    <p className="text-sm text-muted">
                      {stageCount} etapów · {itemCount} elementów
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {template ? (
                      <Button asChild>
                        <Link href={`/procesy/${encodeURIComponent(projectType)}`}>
                          Edytuj szablon
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={creatingType === projectType}
                        onClick={() => void handleCreateTemplate(projectType)}
                      >
                        {creatingType === projectType ? "Tworzenie…" : "Utwórz szablon"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
