"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { flattenChecklistLines, normalizeChecklistPayload } from "@/lib/process/item-payload";
import { PROCESS_ITEM_KIND_LABELS } from "@/lib/process/types";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export default function ProcessElementsPage() {
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const elements = useProcessStore((state) => state.elements);
  const isLoading = useProcessStore((state) => state.isLoading);
  const error = useProcessStore((state) => state.error);
  const hydrate = useProcessStore((state) => state.hydrate);
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    void hydrate(projectTypes);
  }, [hydrate, projectTypes]);

  const filteredElements = useMemo(() => {
    const query = nameFilter.trim().toLocaleLowerCase("pl");
    if (!query) {
      return elements;
    }
    return elements.filter((element) => {
      const haystack = `${element.title} ${element.description ?? ""}`.toLocaleLowerCase("pl");
      return haystack.includes(query);
    });
  }, [elements, nameFilter]);

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

      {!isLoading && elements.length > 0 ? (
        <div className="mb-4 max-w-md">
          <Field label="Filtruj po nazwie">
            <Input
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Szukaj elementu…"
            />
          </Field>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted">Ładowanie elementów…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredElements.map((element) => (
            <Card key={element.id}>
              <CardContent className="grid gap-3 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    {PROCESS_ITEM_KIND_LABELS[element.kind]}
                    {element.isInternalAcceptance ? " · Odbiór wewnętrzny" : ""}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">{element.title}</h2>
                  {element.description ? (
                    <p className="mt-2 text-sm text-muted">{element.description}</p>
                  ) : null}
                </div>
                {element.kind === "checklist" ? (
                  <p className="text-sm text-muted">
                    {flattenChecklistLines(
                      element.kind === "checklist"
                        ? normalizeChecklistPayload(element.defaultPayload)
                        : { sections: [] },
                    ).length}{" "}
                    punktów
                  </p>
                ) : element.kind === "kanban" && "columns" in element.defaultPayload ? (
                  <p className="text-sm text-muted">{element.defaultPayload.columns.length} kolumn</p>
                ) : null}
                <Button asChild size="sm">
                  <Link href={`/procesy/elementy/${element.id}`}>Edytuj</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!filteredElements.length ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="grid gap-3 py-8 text-center">
                <p className="text-sm text-muted">
                  {elements.length && nameFilter.trim()
                    ? "Brak elementów pasujących do filtra."
                    : "Brak elementów procesu — utwórz pierwszą checklistę lub protokół."}
                </p>
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
