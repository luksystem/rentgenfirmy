"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  DASHBOARD_CONTENT_SECTION_LABELS,
  type DashboardContentSection,
  type ProjectDashboardContent,
  type ProjectDashboardContentInput,
} from "@/lib/dashboard/content-types";
import {
  addProjectDashboardContent,
  deleteProjectDashboardContent,
  fetchProjectDashboardContent,
} from "@/lib/supabase/project-dashboard-content-repository";

const EMPTY_CONTENT: ProjectDashboardContent[] = [];

export function ProjectContentPanel({
  projectId,
  section,
  readOnly = false,
  seedItems,
  collapsible = false,
}: {
  projectId: string;
  section: DashboardContentSection;
  readOnly?: boolean;
  seedItems?: ProjectDashboardContent[];
  collapsible?: boolean;
}) {
  const [items, setItems] = useState<ProjectDashboardContent[]>(seedItems ?? EMPTY_CONTENT);
  const [loading, setLoading] = useState(seedItems === undefined);
  const [expanded, setExpanded] = useState(!collapsible);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (seedItems !== undefined) {
      setItems(seedItems.filter((entry) => entry.section === section));
      setLoading(false);
      return;
    }

    void fetchProjectDashboardContent(projectId)
      .then((loaded) => setItems(loaded.filter((entry) => entry.section === section)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId, section, seedItems]);

  async function handleAdd() {
    if (!title.trim() || !url.trim()) {
      return;
    }
    setSaving(true);
    try {
      const input: ProjectDashboardContentInput = {
        section,
        title,
        url,
        description,
        contentType: section === "instructions" ? "youtube" : section === "files" ? "link" : "link",
      };
      const created = await addProjectDashboardContent(projectId, input);
      setItems((current) => [...current, created]);
      setTitle("");
      setUrl("");
      setDescription("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteProjectDashboardContent(id);
    setItems((current) => current.filter((entry) => entry.id !== id));
  }

  const sectionItems = items.filter((entry) => entry.section === section);
  const label = DASHBOARD_CONTENT_SECTION_LABELS[section];

  return (
    <div className="grid gap-3">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-surface-muted/15 px-3 py-2 text-left text-sm font-medium"
        >
          <span>{label}</span>
          <span className="text-xs text-muted">{expanded ? "Zwiń" : "Rozwiń"} · {sectionItems.length}</span>
        </button>
      ) : null}

      {(!collapsible || expanded) && (
        <>
          {loading ? <p className="text-sm text-muted">Ładowanie…</p> : null}

          {!loading && sectionItems.length === 0 ? (
            <p className="text-sm text-muted">
              {readOnly ? "Brak pozycji w tej sekcji." : "Dodaj pierwszą pozycję."}
            </p>
          ) : null}

          <div className="grid gap-2">
            {sectionItems.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-border/70 bg-surface-muted/15 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-accent"
                    >
                      {item.title}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </a>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted">{item.description}</p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {!readOnly ? (
            <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-3">
              <p className="mb-2 text-sm font-medium">Dodaj</p>
              <div className="grid gap-2">
                <Field label="Tytuł">
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </Field>
                <Field label="URL">
                  <Input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Opis (opcjonalnie)">
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                  />
                </Field>
                <Button type="button" size="sm" disabled={saving} onClick={() => void handleAdd()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj pozycję
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
