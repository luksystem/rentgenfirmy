"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ProjectSpecificationInput } from "@/lib/dashboard/specification-types";
import { useProjectSpecificationStore } from "@/store/project-specification-store";

function emptyInput(): ProjectSpecificationInput {
  return {
    title: "",
    category: "Ogólne",
    description: "",
    notes: "",
    catalogItemId: null,
  };
}

export function ProjectSpecificationPanel({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const catalog = useProjectSpecificationStore((state) => state.catalog);
  const items = useProjectSpecificationStore((state) => state.byProject[projectId] ?? []);
  const loading = useProjectSpecificationStore((state) => state.loadingProjects[projectId]);
  const ensureCatalog = useProjectSpecificationStore((state) => state.ensureCatalog);
  const ensureItems = useProjectSpecificationStore((state) => state.ensureItems);
  const addItem = useProjectSpecificationStore((state) => state.addItem);
  const updateItem = useProjectSpecificationStore((state) => state.updateItem);
  const removeItem = useProjectSpecificationStore((state) => state.removeItem);

  const [customForm, setCustomForm] = useState<ProjectSpecificationInput>(emptyInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ensureCatalog();
    void ensureItems(projectId);
  }, [ensureCatalog, ensureItems, projectId]);

  const catalogByCategory = useMemo(() => {
    const map = new Map<string, typeof catalog>();
    for (const entry of catalog) {
      const bucket = map.get(entry.category) ?? [];
      bucket.push(entry);
      map.set(entry.category, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pl"));
  }, [catalog]);

  async function addFromCatalog(catalogItemId: string) {
    const entry = catalog.find((item) => item.id === catalogItemId);
    if (!entry) {
      return;
    }
    setSaving(true);
    try {
      await addItem(projectId, {
        catalogItemId: entry.id,
        title: entry.name,
        category: entry.category,
        description: entry.description,
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCustom() {
    if (!customForm.title.trim()) {
      return;
    }
    setSaving(true);
    try {
      await addItem(projectId, customForm);
      setCustomForm(emptyInput());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {!readOnly ? (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Dodaj z katalogu</p>
            <div className="grid gap-3">
              {catalogByCategory.map(([category, entries]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entries.map((entry) => (
                      <Button
                        key={entry.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void addFromCatalog(entry.id)}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {entry.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface-muted/15 p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Własny element</p>
            <div className="grid gap-2">
              <Field label="Nazwa">
                <Input
                  value={customForm.title}
                  onChange={(event) =>
                    setCustomForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </Field>
              <Field label="Opis">
                <Textarea
                  value={customForm.description}
                  onChange={(event) =>
                    setCustomForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={2}
                />
              </Field>
              <Field label="Notatki">
                <Input
                  value={customForm.notes ?? ""}
                  onChange={(event) =>
                    setCustomForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </Field>
              <Button type="button" size="sm" disabled={saving} onClick={() => void handleAddCustom()}>
                Dodaj element
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {loading && !items.length ? <p className="text-sm text-muted">Ładowanie specyfikacji…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-muted">
          Brak elementów specyfikacji. Dodaj systemy i integracje obowiązkowe dla tego projektu.
        </p>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border/70 bg-surface-muted/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted">{item.category}</p>
              </div>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void removeItem(projectId, item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            ) : null}
            {!readOnly ? (
              <Field label="Notatki projektowe" className="mt-3">
                <Textarea
                  defaultValue={item.notes}
                  rows={2}
                  onBlur={(event) => {
                    const notes = event.target.value;
                    if (notes === item.notes) {
                      return;
                    }
                    void updateItem(projectId, item.id, {
                      catalogItemId: item.catalogItemId,
                      title: item.title,
                      category: item.category,
                      description: item.description,
                      notes,
                    });
                  }}
                />
              </Field>
            ) : item.notes ? (
              <p className="mt-2 text-sm text-muted">Notatki: {item.notes}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
