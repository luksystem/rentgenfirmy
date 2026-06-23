"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AGREEMENT_FILE_MAX_BYTES,
  AGREEMENT_IMAGE_MAX_BYTES,
  validateAgreementAttachmentFile,
} from "@/lib/dashboard/agreement-attachments";
import type { AgreementAttachment } from "@/lib/dashboard/agreement-attachment-types";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AgreementAttachmentGallery({
  attachments,
  allowUpload = false,
  allowDelete = false,
  uploading = false,
  uploadError = null,
  onUpload,
  onDelete,
}: {
  attachments: AgreementAttachment[];
  allowUpload?: boolean;
  allowDelete?: boolean;
  uploading?: boolean;
  uploadError?: string | null;
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (attachmentId: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUpload) {
      return;
    }

    const validation = validateAgreementAttachmentFile({ type: file.type, size: file.size });
    if (!validation.ok) {
      setLocalError(validation.error);
      return;
    }

    setLocalError(null);
    try {
      await onUpload(file);
    } catch (uploadErr) {
      setLocalError(uploadErr instanceof Error ? uploadErr.message : "Nie udało się przesłać pliku.");
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!onDelete) {
      return;
    }
    setLocalError(null);
    setDeletingId(attachmentId);
    try {
      await onDelete(attachmentId);
    } catch (deleteErr) {
      setLocalError(deleteErr instanceof Error ? deleteErr.message : "Nie udało się usunąć pliku.");
    } finally {
      setDeletingId(null);
    }
  }

  const error = uploadError ?? localError;

  return (
    <div className="grid gap-3">
      {attachments.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-surface-muted/10"
            >
              {attachment.mediaKind === "image" && attachment.url ? (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-[4/3] bg-black/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url}
                    alt={attachment.fileName}
                    className="h-full w-full object-cover"
                  />
                </a>
              ) : (
                <a
                  href={attachment.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-surface-muted/20 px-4 text-center",
                    !attachment.url && "pointer-events-none opacity-60",
                  )}
                >
                  <FileText className="h-8 w-8 text-accent" />
                  <span className="line-clamp-2 text-xs font-medium text-foreground">
                    {attachment.fileName}
                  </span>
                </a>
              )}
              <div className="flex items-start justify-between gap-2 border-t border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{attachment.fileName}</p>
                  <p className="text-[10px] text-muted">
                    {attachment.uploadedByName} · {formatFileSize(attachment.sizeBytes)}
                  </p>
                </div>
                {allowDelete && onDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 p-0 text-muted hover:text-rose-300"
                    disabled={deletingId === attachment.id}
                    onClick={() => void handleDelete(attachment.id)}
                  >
                    {deletingId === attachment.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Brak załączników.</p>
      )}

      {allowUpload && onUpload ? (
        <div className="grid gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-3.5 w-3.5" />
            )}
            Dodaj zdjęcie lub plik
          </Button>
          <p className="text-xs text-muted">
            Zdjęcia do {Math.round(AGREEMENT_IMAGE_MAX_BYTES / (1024 * 1024))} MB, pliki (PDF, Word,
            Excel, TXT, ZIP) do {Math.round(AGREEMENT_FILE_MAX_BYTES / (1024 * 1024))} MB.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}

export function AgreementAttachmentPreview({
  attachments,
}: {
  attachments: AgreementAttachment[];
}) {
  const images = attachments.filter((entry) => entry.mediaKind === "image" && entry.url);
  if (!images.length) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {images.slice(0, 4).map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-black/20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.url!} alt={attachment.fileName} className="h-full w-full object-cover" />
        </a>
      ))}
      {attachments.length > images.length ? (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-muted/20 text-xs text-muted">
          +{attachments.length - images.length}
        </div>
      ) : null}
    </div>
  );
}
