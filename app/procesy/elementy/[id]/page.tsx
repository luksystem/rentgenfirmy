"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProcessElementEditor } from "@/components/process/process-element-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchProcessElementPlacements, type ProcessElementPlacement } from "@/lib/supabase/process-element-repository";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcessElementPage() {
  const params = useParams();
  const router = useRouter();
  const elementId = String(params.id);
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const elements = useProcessStore((state) => state.elements);
  const hydrate = useProcessStore((state) => state.hydrate);
  const saveElement = useProcessStore((state) => state.saveElement);
  const removeElement = useProcessStore((state) => state.removeElement);
  const [ready, setReady] = useState(false);
  const [placements, setPlacements] = useState<ProcessElementPlacement[]>([]);

  useEffect(() => {
    void (async () => {
      await hydrate(projectTypes);
      try {
        const loaded = await fetchProcessElementPlacements(elementId);
        setPlacements(loaded);
      } catch {
        setPlacements([]);
      }
      setReady(true);
    })();
  }, [elementId, hydrate, projectTypes]);

  const element = elements.find((entry) => entry.id === elementId);

  if (!ready) {
    return <p className="text-sm text-muted">Ładowanie elementu…</p>;
  }

  if (!element) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-8">
          <p className="text-sm text-muted">Nie znaleziono elementu procesu.</p>
          <Button asChild variant="secondary">
            <Link href="/procesy/elementy">Wróć do katalogu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Element procesu"
        title={element.title}
        description="Wzorzec używany w szablonach procesów — zmiany nie nadpisują już uruchomionych projektów."
        action={
          <Button variant="secondary" asChild>
            <Link href="/procesy/elementy">Katalog elementów</Link>
          </Button>
        }
      />
      <ProcessElementEditor
        key={element.updatedAt}
        initialElement={element}
        placements={placements}
        onSave={saveElement}
        onDelete={async () => {
          await removeElement(element.id);
          router.push("/procesy/elementy");
        }}
      />
    </>
  );
}
