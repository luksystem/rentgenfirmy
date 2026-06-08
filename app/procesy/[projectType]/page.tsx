"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProcessTemplateEditor } from "@/components/process/process-template-editor";
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
  const isInitialized = useAppStore((state) => state.isInitialized);
  const processError = useProcessStore((state) => state.error);
  const hydrate = useProcessStore((state) => state.hydrate);
  const ensureTemplateForProjectType = useProcessStore((state) => state.ensureTemplateForProjectType);
  const saveTemplate = useProcessStore((state) => state.saveTemplate);
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await hydrate(projectTypes);
        await ensureTemplateForProjectType(projectType);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Błąd ładowania szablonu.");
      } finally {
        setReady(true);
      }
    })();
  }, [ensureTemplateForProjectType, hydrate, projectType, projectTypes]);

  const template = getTemplateByProjectType(projectType);

  if (!isInitialized || !ready) {
    return <p className="text-sm text-muted">Ładowanie szablonu procesu…</p>;
  }

  if (loadError || processError) {
    return (
      <Card className="border-rose-500/30">
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-rose-300">{loadError ?? processError}</p>
          <p className="text-sm text-muted">
            Upewnij się, że uruchomiłeś migrację{" "}
            <code className="rounded bg-surface-muted px-1">015_processes.sql</code> w Supabase.
          </p>
          <Button asChild variant="secondary">
            <Link href="/procesy">Wróć do listy procesów</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie udało się utworzyć szablonu dla typu „{projectType}”.</p>
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

      <ProcessTemplateEditor
        key={template.updatedAt}
        initialTemplate={template}
        onSave={saveTemplate}
      />
    </>
  );
}
