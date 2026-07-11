"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import {
  PROJECT_DOCUMENT_CATEGORIES,
  PROJECT_DOCUMENT_CATEGORY_LABELS,
  isImageDocument,
  type ProjectDocument,
  type ProjectDocumentCategory,
} from "@/lib/documents/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import {
  deleteProjectDocument,
  fetchProjectDocuments,
} from "@/lib/supabase/project-document-repository";
import { formatPartyName } from "@/lib/party/display-name";
import { useAppStore } from "@/store/app-store";
import { cn, formatDateTime } from "@/lib/utils";

const ALL = "";

function categoryBadgeClass(category: ProjectDocumentCategory) {
  switch (category) {
    case "photo":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "plan":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "protocol":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "pdf":
    case "scan":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-border bg-surface-muted/40 text-muted";
  }
}

export function ProjectDocumentList() {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [clientFilter, setClientFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, formatPartyName(client)])),
    [clients],
  );

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchProjectDocuments();
      setDocuments(rows);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useListAutoRefresh(refresh);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (categoryFilter && document.category !== categoryFilter) {
        return false;
      }
      if (clientFilter && document.clientId !== clientFilter) {
        return false;
      }
      if (projectFilter && document.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, clientFilter, documents, projectFilter]);

  async function removeDocument(documentId: string) {
    if (!window.confirm("Usunąć ten dokument?")) {
      return;
    }

    setDeletingId(documentId);
    try {
      await deleteProjectDocument(documentId);
      setDocuments((current) => current.filter((entry) => entry.id !== documentId));
    } finally {
      setDeletingId(null);
    }
  }

  const filters = (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Kategoria">
        <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {PROJECT_DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {PROJECT_DOCUMENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Klient">
        <Select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
          <option value={ALL}>Wszyscy</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {formatPartyName(client)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Projekt">
        <Select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {loading ? "Ładowanie…" : `${filteredDocuments.length} dokumentów`}
        </div>
        <Button asChild>
          <Link href="/dokumenty/nowy">
            <Plus className="h-4 w-4" />
            Dodaj dokument
          </Link>
        </Button>
      </div>

      <MobileFiltersPanel title="Filtry">{filters}</MobileFiltersPanel>
      <div className="hidden sm:block">{filters}</div>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">Ładowanie dokumentacji…</CardContent>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            Brak dokumentów. Dodaj zdjęcie, skan lub PDF powiązany z klientem lub projektem.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-surface-muted/40 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Kategoria</th>
                  <th className="px-4 py-3 font-medium">Tytuł</th>
                  <th className="px-4 py-3 font-medium">Klient / projekt</th>
                  <th className="px-4 py-3 font-medium">Plik</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="border-b border-border/60 hover:bg-surface-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(document.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          categoryBadgeClass(document.category),
                        )}
                      >
                        {PROJECT_DOCUMENT_CATEGORY_LABELS[document.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{document.title}</div>
                      {document.description ? (
                        <div className="text-xs text-muted">{document.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div>{document.clientId ? clientNames.get(document.clientId) ?? "—" : "—"}</div>
                      <div className="text-xs">
                        {document.projectId ? projectNames.get(document.projectId) ?? "—" : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {document.fileUrl ? (
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {isImageDocument(document) ? "Podgląd" : "Otwórz"}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === document.id}
                        onClick={() => void removeDocument(document.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredDocuments.map((document) => (
              <Card key={document.id}>
                <CardContent className="grid gap-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{document.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(document.createdAt)}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        categoryBadgeClass(document.category),
                      )}
                    >
                      {PROJECT_DOCUMENT_CATEGORY_LABELS[document.category]}
                    </span>
                  </div>
                  {document.description ? (
                    <p className="text-sm text-muted">{document.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {document.fileUrl ? (
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <a href={document.fileUrl} target="_blank" rel="noreferrer">
                          Otwórz plik
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === document.id}
                      onClick={() => void removeDocument(document.id)}
                    >
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
