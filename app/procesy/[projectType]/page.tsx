"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProcessPipeline } from "@/components/process/process-pipeline";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { countProcessItems } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcessTemplatePage() {
  const params = useParams();
  const projectType = decodeURIComponent(String(params.projectType));
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const hydrate = useProcessStore((state) => state.hydrate);
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrate(projectTypes).finally(() => setReady(true));
  }, [hydrate, projectTypes]);

  const template = getTemplateByProjectType(projectType);

  if (!ready) {
    return <p className="text-sm text-muted">Ładowanie szablonu procesu…</p>;
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie znaleziono szablonu dla typu „{projectType}”.</p>
          <Button asChild variant="secondary">
            <Link href="/procesy">Wróć do listy procesów</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const itemCount = countProcessItems(template);

  return (
    <>
      <PageHeader
        eyebrow="Szablon procesu"
        title={template.name}
        description={`${template.description} · ${template.stages.length} etapów · ${itemCount} elementów.`}
        action={
          <Button variant="secondary" asChild>
            <Link href="/procesy">Lista procesów</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="py-5">
          <ProcessPipeline template={template} />
        </CardContent>
      </Card>
    </>
  );
}
