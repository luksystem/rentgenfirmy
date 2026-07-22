"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC } from "@/lib/dashboard/agreement-attachments";
import { attachSignedUrlsToChecklistAttachments } from "@/lib/supabase/checklist-attachments-repository";
import type { ChecklistLine, ChecklistLineAttachment } from "@/lib/process/types";
import { cn } from "@/lib/utils";

/** Odśwież podpisane URL-e zanim wygasną (TTL/2), żeby nie trafić na wygasły token w trakcie sesji. */
const SIGNED_URL_REFRESH_INTERVAL_MS = (AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC * 1000) / 2;

export type DocumentationRequirement = {
  requireDocumentation?: boolean;
  documentationHint?: string;
  attachments?: ChecklistLineAttachment[];
};

export type ChecklistDocumentationUploadContext =
  | { mode: "team"; projectProcessItemId: string; actorName: string }
  | { mode: "public"; publicToken: string; actorName: string };

export type InternalAcceptanceDocumentationUploadContext =
  | { mode: "acceptance-team"; projectProcessItemId: string; actorName: string }
  | { mode: "acceptance-public"; publicToken: string; actorName: string };

export type ProcessDocumentationUploadContext =
  | ChecklistDocumentationUploadContext
  | InternalAcceptanceDocumentationUploadContext;

function resolveRequirement(
  line: ChecklistLine | undefined,
  requirement: DocumentationRequirement | undefined,
): DocumentationRequirement {
  if (requirement) {
    return requirement;
  }
  return {
    requireDocumentation: line?.requireDocumentation,
    documentationHint: line?.documentationHint,
    attachments: line?.attachments,
  };
}

export function ChecklistLineDocumentationPanel({
  line,
  requirement,
  targetId,
  lineId,
  readOnly = false,
  saving = false,
  uploadContext,
  onAttachmentsChange,
}: {
  line?: ChecklistLine;
  requirement?: DocumentationRequirement;
  /** Id punktu checklisty lub itemKey odbioru wewnętrznego */
  targetId?: string;
  /** @deprecated użyj targetId */
  lineId?: string;
  readOnly?: boolean;
  saving?: boolean;
  uploadContext?: ProcessDocumentationUploadContext;
  onAttachmentsChange: (attachments: ChecklistLineAttachment[]) => void;
}) {
  const resolvedTargetId = targetId ?? lineId ?? line?.id ?? "";
  const resolvedRequirement = resolveRequirement(line, requirement);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(resolvedRequirement.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const retriedOnErrorRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const source = resolvedRequirement.attachments ?? [];
    setAttachments(source);
    retriedOnErrorRef.current.clear();
    if (!source.length) {
      return;
    }

    let cancelled = false;
    void attachSignedUrlsToChecklistAttachments(source).then((next) => {
      if (!cancelled) {
        setAttachments(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedRequirement.attachments, resolvedTargetId]);

  // Podpisane URL-e do plików wygasają po AGREEMENT_ATTACHMENT_SIGNED_URL_TTL_SEC — jeśli okno
  // zostanie otwarte dłużej, trzeba je odświeżyć w tle, inaczej miniaturki/linki przestają działać
  // (Supabase odrzuca wygasły token: "exp" claim timestamp check failed).
  useEffect(() => {
    const interval = setInterval(() => {
      if (!attachmentsRef.current.length) {
        return;
      }
      void attachSignedUrlsToChecklistAttachments(attachmentsRef.current).then(setAttachments);
    }, SIGNED_URL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const refreshAttachmentUrl = useCallback(async (attachmentId: string) => {
    const target = attachmentsRef.current.find((entry) => entry.id === attachmentId);
    if (!target) {
      return null;
    }
    const [refreshed] = await attachSignedUrlsToChecklistAttachments([target]);
    if (!refreshed?.url) {
      return null;
    }
    setAttachments((current) =>
      current.map((entry) => (entry.id === attachmentId ? { ...entry, url: refreshed.url } : entry)),
    );
    return refreshed.url;
  }, []);

  function handleImageError(attachmentId: string) {
    if (retriedOnErrorRef.current.has(attachmentId)) {
      return;
    }
    retriedOnErrorRef.current.add(attachmentId);
    void refreshAttachmentUrl(attachmentId);
  }

  async function handleOpenAttachment(event: React.MouseEvent, attachment: ChecklistLineAttachment) {
    event.preventDefault();
    const freshUrl = await refreshAttachmentUrl(attachment.id);
    const target = freshUrl ?? attachment.url;
    if (target) {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  }

  if (!resolvedRequirement.requireDocumentation && !attachments.length) {
    return null;
  }

  async function uploadFile(file: File) {
    if (!uploadContext) {
      setError("Brak kontekstu zapisu — odśwież widok.");
      return;
    }

    if (!resolvedTargetId) {
      setError("Brak identyfikatora punktu.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint: string;

      if (uploadContext.mode === "team") {
        formData.append("projectProcessItemId", uploadContext.projectProcessItemId);
        formData.append("lineId", resolvedTargetId);
        formData.append("authorName", uploadContext.actorName);
        endpoint = "/api/process/checklist/attachments";
      } else if (uploadContext.mode === "public") {
        formData.append("lineId", resolvedTargetId);
        formData.append("actorName", uploadContext.actorName);
        endpoint = `/api/element/${encodeURIComponent(uploadContext.publicToken)}/attachments`;
      } else if (uploadContext.mode === "acceptance-team") {
        formData.append("projectProcessItemId", uploadContext.projectProcessItemId);
        formData.append("itemKey", resolvedTargetId);
        formData.append("authorName", uploadContext.actorName);
        endpoint = "/api/process/internal-acceptance/attachments";
      } else {
        formData.append("itemKey", resolvedTargetId);
        formData.append("actorName", uploadContext.actorName);
        endpoint = `/api/odbior/${encodeURIComponent(uploadContext.publicToken)}/attachments`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Nie udało się przesłać pliku.");
      }

      const payload = (await response.json()) as { attachment: ChecklistLineAttachment };
      setAttachments((current) => {
        const nextAttachments = [...current, payload.attachment];
        onAttachmentsChange(nextAttachments);
        return nextAttachments;
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd przesyłania.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  }

  function handleRemove(attachmentId: string) {
    const nextAttachments = attachments.filter((entry) => entry.id !== attachmentId);
    setAttachments(nextAttachments);
    onAttachmentsChange(nextAttachments);
  }

  const needsDocumentation = resolvedRequirement.requireDocumentation && !attachments.length;

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border p-3",
        needsDocumentation
          ? "border-amber-500/35 bg-amber-500/8"
          : "border-border/70 bg-surface-muted/20",
      )}
    >
      <div className="flex items-start gap-2">
        <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Dokumentacja wymagana</p>
          {resolvedRequirement.documentationHint?.trim() ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {resolvedRequirement.documentationHint.trim()}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Dodaj zdjęcie lub plik przed oznaczeniem punktu jako Spełnia.
            </p>
          )}
        </div>
      </div>

      {attachments.length ? (
        <ul className="grid gap-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/50 p-2"
            >
              {attachment.mediaKind === "image" && attachment.url ? (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0"
                  onClick={(event) => void handleOpenAttachment(event, attachment)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url}
                    alt={attachment.fileName}
                    className="h-14 w-14 rounded-md object-cover"
                    onError={() => handleImageError(attachment.id)}
                  />
                </a>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-muted">
                  <FileText className="h-5 w-5 text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-accent hover:underline"
                    onClick={(event) => void handleOpenAttachment(event, attachment)}
                  >
                    {attachment.fileName}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">{attachment.fileName}</p>
                )}
                {attachment.uploadedBy ? (
                  <p className="text-[11px] text-muted">{attachment.uploadedBy}</p>
                ) : null}
              </div>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={saving || uploading}
                  onClick={() => handleRemove(attachment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!readOnly && uploadContext ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            disabled={saving || uploading}
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              if (files.length) {
                void (async () => {
                  for (const file of files) {
                    await uploadFile(file);
                  }
                })();
              }
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            disabled={saving || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadFile(file);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="mr-1.5 h-3.5 w-3.5" />
            )}
            Zrób zdjęcie
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            Dodaj plik
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {needsDocumentation && !readOnly ? (
        <p className="text-xs text-amber-200">Bez załącznika nie oznaczysz punktu jako Spełnia.</p>
      ) : null}
    </div>
  );
}
