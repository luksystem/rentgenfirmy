"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InternalAcceptanceTemplateEditor } from "@/components/process/internal-acceptance-template-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createDefaultInternalAcceptanceTemplateConfig } from "@/lib/internal-acceptance/template-config";
import {
  fetchInternalAcceptanceTemplateConfig,
  saveInternalAcceptanceTemplateConfig,
} from "@/lib/supabase/internal-acceptance-config-repository";
import { flattenProcessItems } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcessInternalAcceptanceConfigPage() {
  const params = useParams();
  const projectType = decodeURIComponent(String(params.projectType));
  const processItemId = String(params.itemId);

  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const hydrate = useProcessStore((state) => state.hydrate);
  const ensureTemplateForProjectType = useProcessStore((state) => state.ensureTemplateForProjectType);
  const getTemplateByProjectType = useProcessStore((state) => state.getTemplateByProjectType);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [config, setConfig] = useState(createDefaultInternalAcceptanceTemplateConfig());

  const template = getTemplateByProjectType(projectType);

  const processItem = useMemo(() => {
    if (!template) {
      return null;
    }
    return flattenProcessItems(template).find((item) => item.id === processItemId) ?? null;
  }, [processItemId, template]);

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

  useEffect(() => {
    if (!processItem?.isInternalAcceptance) {
      return;
    }
    void fetchInternalAcceptanceTemplateConfig(processItemId)
      .then((loaded) => {
        setConfig(loaded ?? createDefaultInternalAcceptanceTemplateConfig());
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Błąd ładowania konfiguracji.");
      });
  }, [processItem?.isInternalAcceptance, processItemId]);

  if (!isInitialized || !ready) {
    return <p className="text-sm text-muted">Ładowanie konfiguracji odbioru…</p>;
  }

  if (loadError) {
    return (
      <Card className="border-rose-500/30">
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-rose-300">{loadError}</p>
          <Button asChild variant="secondary">
            <Link href={`/procesy/${encodeURIComponent(projectType)}`}>Wróć do szablonu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!template || !processItem) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie znaleziono elementu procesu w szablonie.</p>
          <Button asChild variant="secondary">
            <Link href={`/procesy/${encodeURIComponent(projectType)}`}>Wróć do szablonu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!processItem.isInternalAcceptance) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">
            Ten element nie jest oznaczony jako odbiór wewnętrzny. Włącz flagę w katalogu elementów
            procesu.
          </p>
          <Button asChild variant="secondary">
            <Link href={`/procesy/${encodeURIComponent(projectType)}`}>Wróć do szablonu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Szablon: ${projectType}`}
        title={`Odbiór wewnętrzny — ${processItem.title}`}
        description="Zdefiniuj stałe punkty, źródła z projektu i kolejność generowania checklisty QA."
        action={
          <Button variant="secondary" asChild>
            <Link href={`/procesy/${encodeURIComponent(projectType)}`}>Wróć do szablonu procesu</Link>
          </Button>
        }
      />

      <InternalAcceptanceTemplateEditor
        key={`${processItemId}-${config.staticItems.length}-${config.enabledRulePackIds.length}`}
        initialConfig={config}
        onSave={async (nextConfig) => {
          const saved = await saveInternalAcceptanceTemplateConfig(
            processItemId,
            template.id,
            nextConfig,
          );
          setConfig(saved);
        }}
      />
    </>
  );
}
