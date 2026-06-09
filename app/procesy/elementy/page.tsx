"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROCESS_ITEM_KIND_LABELS } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcessElementsPage() {
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const elements = useProcessStore((state) => state.elements);
  const isLoading = useProcessStore((state) => state.isLoading);
  const error = useProcessStore((state) => state.error);
  const hydrate = useProcessStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate(projectTypes);
  }, [hydrate, projectTypes]);

  return (
    <>
      <PageHeader
        eyebrow="Moduł operacyjny"
        title="Elementy procesu"
        description="Wielokrotnego użytku checklisty, protokoły i rozliczenia — definiujesz raz, wstawiasz w szablonach procesów."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/procesy">Szablony procesów</Link>
            </Button>
            <Button asChild>
              <Link href="/procesy/elementy/nowy">Nowy element</Link>
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
        <p className="text-sm text-muted">Ładowanie elementów…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {elements.map((element) => (
            <Card key={element.id}>
              <CardContent className="grid gap-3 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    {PROCESS_ITEM_KIND_LABELS[element.kind]}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{element.title}</h2>
                  {element.description ? (
                    <p className="mt-2 text-sm text-muted">{element.description}</p>
                  ) : null}
                </div>
                {element.kind === "checklist" ? (
                  <p className="text-sm text-muted">{element.defaultPayload.lines.length} punktów</p>
                ) : null}
                <Button asChild size="sm">
                  <Link href={`/procesy/elementy/${element.id}`}>Edytuj</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!elements.length ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="grid gap-3 py-8 text-center">
                <p className="text-sm text-muted">Brak elementów procesu — utwórz pierwszą checklistę lub protokół.</p>
                <Button asChild className="mx-auto w-fit">
                  <Link href="/procesy/elementy/nowy">Utwórz element</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
