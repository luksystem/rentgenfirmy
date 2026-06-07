"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { countProcessItems } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcesyPage() {
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const templates = useProcessStore((state) => state.templates);
  const isLoading = useProcessStore((state) => state.isLoading);

  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Procesy"
        description="Szablony pipeline per typ projektu — etapy, kamienie milowe, checklisty, protokoły odbioru i rozliczenia."
      />

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
                      {template?.description ??
                        "Brak szablonu — zostanie utworzony przy pierwszym wejściu."}
                    </p>
                  </div>
                  {template ? (
                    <p className="text-sm text-muted">
                      {stageCount} etapów · {itemCount} elementów (checklisty, protokoły, rozliczenia)
                    </p>
                  ) : null}
                  <Button asChild variant={template ? "default" : "secondary"}>
                    <Link href={`/procesy/${encodeURIComponent(projectType)}`}>
                      {template ? "Otwórz szablon" : "Utwórz szablon"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
