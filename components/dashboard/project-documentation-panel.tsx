"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FileText,
  FolderOpen,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LayoutGrid,
  StickyNote,
} from "lucide-react";
import { ProjectContentPanel } from "@/components/dashboard/project-content-panel";
import { ProjectDocumentsPanel } from "@/components/dashboard/project-documents-panel";
import { ProjectSystemCredentialsPanel } from "@/components/dashboard/project-system-credentials-panel";
import { ProjectTechnicalDocumentationUpload } from "@/components/dashboard/project-technical-documentation-upload";
import type { ProjectDashboardContent } from "@/lib/dashboard/content-types";
import type { DocumentationMediaItem } from "@/lib/dashboard/documentation-media-types";
import type { SystemCredentialMeta } from "@/lib/dashboard/system-credentials-types";
import type { ProjectDocument } from "@/lib/documents/types";
import { cn, formatDateTime } from "@/lib/utils";

type DocumentationSubTab = "view" | "documents" | "photos" | "notes" | "credentials" | "links";

const SUB_TABS: Array<{ id: DocumentationSubTab; label: string; icon: typeof FolderOpen }> = [
  { id: "view", label: "Widok", icon: LayoutGrid },
  { id: "documents", label: "Dokumenty", icon: FileText },
  { id: "photos", label: "Zdjęcia", icon: ImageIcon },
  { id: "notes", label: "Notatki", icon: StickyNote },
  { id: "credentials", label: "Hasła", icon: KeyRound },
  { id: "links", label: "Linki", icon: Link2 },
];

function MediaThumbnail({ item }: { item: DocumentationMediaItem }) {
  const isPhoto = item.kind === "photo" && item.url;
  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-surface-elevated/40 text-left transition hover:border-accent/50",
        !item.url && "pointer-events-none opacity-60",
      )}
    >
      {isPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url ?? undefined} alt={item.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-surface-muted/40">
          <FileText className="h-8 w-8 text-muted" />
        </div>
      )}
      <div className="min-w-0 px-2 py-1.5">
        <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
        <p className="truncate text-[10px] text-muted">{item.sourceLabel}</p>
      </div>
    </a>
  );
}

function useDocumentationMedia(projectId: string, publicToken?: string) {
  const [items, setItems] = useState<DocumentationMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = publicToken
      ? `/api/przestrzen/${encodeURIComponent(publicToken)}/documentation-media?projectId=${encodeURIComponent(projectId)}`
      : `/api/projects/${encodeURIComponent(projectId)}/documentation/media`;
    fetch(url, { credentials: "include" })
      .then((response) => response.json())
      .then((body: { items?: DocumentationMediaItem[] }) => {
        if (!cancelled) {
          setItems(body.items ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, publicToken]);

  return { items, loading };
}

export function ProjectDocumentationPanel({
  projectId,
  projectName,
  clientId,
  readOnly,
  publicToken,
  seedDocuments,
  seedCredentials,
  seedContent,
  enableCredentials = true,
  enableContent = true,
  notesSlot,
  authorName,
  authorId,
}: {
  projectId: string;
  /** Tylko do sekcji "Dokumentacja techniczna" (zespół) — nazwa pliku przy eksporcie do Excela. */
  projectName?: string;
  clientId: string;
  readOnly: boolean;
  publicToken?: string;
  seedDocuments?: ProjectDocument[];
  seedCredentials?: SystemCredentialMeta[];
  seedContent?: ProjectDashboardContent[];
  enableCredentials?: boolean;
  enableContent?: boolean;
  /** Zawartość podzakładki "Notatki" — dostarczana przez rodzica (dzieli logikę odczytu z
   *  samodzielną zakładką "Notatki" w głównym menu, żeby nie duplikować śledzenia przeczytania). */
  notesSlot?: ReactNode;
  /** Tylko do sekcji "Dokumentacja techniczna" (zespół) — kto wgrywa plik. */
  authorName?: string;
  authorId?: string | null;
}) {
  const [subTab, setSubTab] = useState<DocumentationSubTab>("view");
  const { items: media, loading: mediaLoading } = useDocumentationMedia(projectId, publicToken);

  const photos = useMemo(() => media.filter((item) => item.kind === "photo"), [media]);
  const otherDocuments = useMemo(() => media.filter((item) => item.kind === "document"), [media]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-border/80 bg-surface p-4">
      <h2 className="page-section-title mb-3 text-base font-semibold">Dokumentacja projektu</h2>

      <div className="mb-4 flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SUB_TABS.filter((tab) => tab.id !== "credentials" || enableCredentials)
          .filter((tab) => tab.id !== "links" || enableContent)
          .filter((tab) => tab.id !== "notes" || Boolean(notesSlot))
          .map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border/70 text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
      </div>

      {subTab === "view" ? (
        <div className="grid gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Ostatnie zdjęcia</p>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => setSubTab("photos")}
              >
                Zobacz wszystkie ({photos.length})
              </button>
            </div>
            {mediaLoading ? (
              <p className="text-sm text-muted">Wczytywanie…</p>
            ) : photos.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {photos.slice(0, 4).map((item) => (
                  <MediaThumbnail key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Brak zdjęć.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Ostatnie dokumenty</p>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => setSubTab("documents")}
              >
                Zobacz wszystkie ({otherDocuments.length})
              </button>
            </div>
            {mediaLoading ? (
              <p className="text-sm text-muted">Wczytywanie…</p>
            ) : otherDocuments.length ? (
              <div className="grid gap-1.5">
                {otherDocuments.slice(0, 4).map((item) => (
                  <a
                    key={item.id}
                    href={item.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated/40 px-3 py-2 text-sm hover:border-accent/50"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">{formatDateTime(item.createdAt)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Brak dokumentów.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {notesSlot ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                onClick={() => setSubTab("notes")}
              >
                <StickyNote className="h-3.5 w-3.5" />
                Notatki
              </button>
            ) : null}
            {enableCredentials ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                onClick={() => setSubTab("credentials")}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Hasła
              </button>
            ) : null}
            {enableContent ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted hover:text-foreground"
                onClick={() => setSubTab("links")}
              >
                <Link2 className="h-3.5 w-3.5" />
                Linki
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {subTab === "documents" ? (
        <div className="grid gap-4">
          {!readOnly ? (
            <ProjectTechnicalDocumentationUpload
              projectId={projectId}
              projectName={projectName ?? "Projekt"}
              authorName={authorName ?? "Zespół"}
              authorId={authorId ?? null}
            />
          ) : null}
          <ProjectDocumentsPanel
            projectId={projectId}
            clientId={clientId}
            mode={readOnly ? "client" : "team"}
            seedDocuments={seedDocuments}
          />
          {otherDocuments.length ? (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Dokumenty z innych miejsc procesu</p>
              <div className="grid gap-1.5">
                {otherDocuments.map((item) => (
                  <a
                    key={item.id}
                    href={item.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated/40 px-3 py-2 text-sm hover:border-accent/50"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">{item.sourceLabel}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {subTab === "photos" ? (
        mediaLoading ? (
          <p className="text-sm text-muted">Wczytywanie…</p>
        ) : photos.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {photos.map((item) => (
              <MediaThumbnail key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Brak zdjęć w projekcie.</p>
        )
      ) : null}

      {subTab === "notes" && notesSlot ? notesSlot : null}

      {subTab === "credentials" && enableCredentials ? (
        <ProjectSystemCredentialsPanel
          projectId={projectId}
          readOnly={readOnly}
          publicToken={readOnly ? publicToken : undefined}
          seedCredentials={seedCredentials}
        />
      ) : null}

      {subTab === "links" && enableContent ? (
        <div className="grid min-w-0 gap-4">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 className="h-4 w-4 text-accent" />
              Linki zewnętrzne
            </h3>
            <ProjectContentPanel
              projectId={projectId}
              section="links"
              readOnly={readOnly}
              seedItems={seedContent}
              collapsible={false}
            />
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FolderOpen className="h-4 w-4 text-accent" />
              Pliki i zdjęcia
            </h3>
            <ProjectContentPanel
              projectId={projectId}
              section="files"
              readOnly={readOnly}
              seedItems={seedContent}
              collapsible
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Instrukcje</h3>
            <ProjectContentPanel
              projectId={projectId}
              section="instructions"
              readOnly={readOnly}
              seedItems={seedContent}
              collapsible
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
