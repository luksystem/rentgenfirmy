"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROJECT_DOCUMENT_CATEGORY_LABELS,
  isImageDocument,
  type ProjectDocument,
} from "@/lib/documents/types";
import {
  attachSignedUrlsToProjectDocuments,
  deleteProjectDocument,
  fetchProjectDocuments,
} from "@/lib/supabase/project-document-repository";
import { cn, formatDateTime } from "@/lib/utils";

export function ProjectDocumentsPanel({
  projectId,
  clientId,
  mode,
  seedDocuments,
}: {
  projectId: string;
  clientId?: string | null;
  mode: "team" | "client";
  seedDocuments?: ProjectDocument[];
}) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(seedDocuments ?? []);
  const [loading, setLoading] = useState(seedDocuments === undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const rows =
          seedDocuments !== undefined
            ? seedDocuments
            : await fetchProjectDocuments({ projectId });
        const withUrls = await attachSignedUrlsToProjectDocuments(rows);
        if (!cancelled) {
          setDocuments(withUrls);
        }
      } catch {
        if (!cancelled) {
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId, seedDocuments]);

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

  const newDocumentHref = clientId
    ? `/dokumenty/nowy?projectId=${encodeURIComponent(projectId)}&clientId=${encodeURIComponent(clientId)}`
    : `/dokumenty/nowy?projectId=${encodeURIComponent(projectId)}`;

  if (loading && documents.length === 0) {
    return <p className="text-sm text-muted">Ładowanie dokumentacji…</p>;
  }

  return (
    <div className="grid gap-4">
      {mode === "team" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Plany, zdjęcia, skany i PDF przypisane do tego projektu.
          </p>
          <Button type="button" size="sm" asChild>
            <Link href={newDocumentHref}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj dokument
            </Link>
          </Button>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
          {mode === "client"
            ? "Brak dokumentów w dokumentacji projektu."
            : "Brak dokumentów. Dodaj pierwszy plik powiązany z projektem."}
        </p>
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileUp className="h-4 w-4 shrink-0 text-accent" />
                    <p className="break-words font-medium text-foreground">{document.title}</p>
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {PROJECT_DOCUMENT_CATEGORY_LABELS[document.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(document.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {document.fileUrl ? (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        {isImageDocument(document) ? "Podgląd" : "Otwórz"}
                      </a>
                    </Button>
                  ) : null}
                  {mode === "team" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === document.id}
                      onClick={() => void removeDocument(document.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {document.description ? (
                <p className={cn("mt-2 break-words text-sm text-muted")}>{document.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
