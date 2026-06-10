"use client";

import { useRef, useState } from "react";
import { Film, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KANBAN_IMAGE_MAX_BYTES,
  KANBAN_VIDEO_MAX_BYTES,
  validateKanbanAttachmentFile,
} from "@/lib/process/kanban-attachments";
import type { KanbanAttachment } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";

export function KanbanAttachmentGallery({
  attachments,
  allowUpload = false,
  hasVideo = false,
  uploading = false,
  uploadError = null,
  onUpload,
}: {
  attachments: KanbanAttachment[];
  allowUpload?: boolean;
  hasVideo?: boolean;
  uploading?: boolean;
  uploadError?: string | null;
  onUpload?: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUpload) {
      return;
    }

    const validation = validateKanbanAttachmentFile({ type: file.type, size: file.size });
    if (!validation.ok) {
      setLocalError(validation.error);
      return;
    }

    if (validation.mediaKind === "video" && hasVideo) {
      setLocalError("Na tej karcie jest już film — możesz dodać tylko jeden.");
      return;
    }

    setLocalError(null);
    try {
      await onUpload(file);
    } catch (uploadErr) {
      setLocalError(uploadErr instanceof Error ? uploadErr.message : "Nie udało się przesłać pliku.");
    }
  }

  const error = uploadError ?? localError;

  return (
    <div className="grid gap-2">
      {attachments.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <KanbanAttachmentTile key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Brak zdjęć i filmów.</p>
      )}

      {allowUpload && onUpload ? (
        <div className="grid gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-1.5 h-4 w-4" />
            )}
            {uploading ? "Przesyłanie…" : "Dodaj zdjęcie lub film"}
          </Button>
          <p className="text-xs text-muted">
            Zdjęcia do {(KANBAN_IMAGE_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB (bez limitu liczby).
            {hasVideo
              ? " Film już dodany — tylko jeden na kartę."
              : ` Jeden film do ${(KANBAN_VIDEO_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB.`}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

function KanbanAttachmentTile({ attachment }: { attachment: KanbanAttachment }) {
  if (attachment.mediaKind === "video" && attachment.url) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/70 bg-surface/40">
        <video
          src={attachment.url}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black object-contain"
        />
        <p className="truncate px-2 py-1.5 text-[11px] text-muted">{attachment.fileName}</p>
      </div>
    );
  }

  if (attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-xl border border-border/70 bg-surface/40 transition hover:border-accent/40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="aspect-[4/3] w-full object-cover"
        />
      </a>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border/70 bg-surface/30 text-muted">
      <Film className="h-5 w-5" />
    </div>
  );
}

export function KanbanAttachmentPreview({
  attachments,
  className,
}: {
  attachments: KanbanAttachment[];
  className?: string;
}) {
  const cover = attachments.find((entry) => entry.mediaKind === "image" && entry.url) ?? attachments[0];
  if (!cover?.url) {
    return null;
  }

  if (cover.mediaKind === "video") {
    return (
      <div className={cn("mb-2 overflow-hidden rounded-lg border border-border/50", className)}>
        <div className="flex aspect-video items-center justify-center bg-black/80 text-xs text-white/80">
          <Film className="mr-1 h-3.5 w-3.5" />
          Film
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mb-2 overflow-hidden rounded-lg border border-border/50", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.url} alt="" className="aspect-[16/9] w-full object-cover" />
      {attachments.filter((entry) => entry.mediaKind === "image").length > 1 ? (
        <p className="bg-surface/60 px-2 py-0.5 text-[10px] text-muted">
          +{attachments.filter((entry) => entry.mediaKind === "image").length - 1} zdjęć
        </p>
      ) : null}
    </div>
  );
}
