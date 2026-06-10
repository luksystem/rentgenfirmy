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

export type KanbanAttachmentUploadOptions = {
  setAsCardCover?: boolean;
};

export function KanbanAttachmentGallery({
  attachments,
  allowUpload = false,
  allowCoverManage = false,
  hasVideo = false,
  uploading = false,
  coverUpdatingId = null,
  uploadError = null,
  onUpload,
  onSetCover,
}: {
  attachments: KanbanAttachment[];
  allowUpload?: boolean;
  allowCoverManage?: boolean;
  hasVideo?: boolean;
  uploading?: boolean;
  coverUpdatingId?: string | null;
  uploadError?: string | null;
  onUpload?: (file: File, options?: KanbanAttachmentUploadOptions) => Promise<void>;
  onSetCover?: (attachmentId: string, isCardCover: boolean) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [setAsCardCover, setSetAsCardCover] = useState(false);

  const canManageCover = allowCoverManage && Boolean(onSetCover);
  const hasCover = attachments.some((entry) => entry.isCardCover && entry.mediaKind === "image");

  function clearPendingImage() {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingImage(null);
    setPendingPreviewUrl(null);
    setSetAsCardCover(false);
  }

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

    if (validation.mediaKind === "image") {
      clearPendingImage();
      setPendingImage(file);
      setPendingPreviewUrl(URL.createObjectURL(file));
      setSetAsCardCover(false);
      return;
    }

    try {
      await onUpload(file);
    } catch (uploadErr) {
      setLocalError(uploadErr instanceof Error ? uploadErr.message : "Nie udało się przesłać pliku.");
    }
  }

  async function handleConfirmImageUpload() {
    if (!pendingImage || !onUpload) {
      return;
    }

    setLocalError(null);
    try {
      await onUpload(pendingImage, { setAsCardCover });
      clearPendingImage();
    } catch (uploadErr) {
      setLocalError(uploadErr instanceof Error ? uploadErr.message : "Nie udało się przesłać pliku.");
    }
  }

  async function handleCoverChange(attachmentId: string, isCardCover: boolean) {
    if (!onSetCover) {
      return;
    }

    setLocalError(null);
    try {
      await onSetCover(attachmentId, isCardCover);
    } catch (coverErr) {
      setLocalError(coverErr instanceof Error ? coverErr.message : "Nie udało się zmienić okładki.");
    }
  }

  const error = uploadError ?? localError;

  return (
    <div className="grid gap-2">
      {attachments.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <KanbanAttachmentTile
              key={attachment.id}
              attachment={attachment}
              canManageCover={canManageCover}
              coverUpdating={coverUpdatingId === attachment.id || coverUpdatingId === "all"}
              coverActionsDisabled={Boolean(coverUpdatingId)}
              onSetCover={onSetCover ? (isCardCover) => handleCoverChange(attachment.id, isCardCover) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Brak zdjęć i filmów.</p>
      )}

      {canManageCover && hasCover ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-fit"
          disabled={Boolean(coverUpdatingId)}
          onClick={() => void handleCoverChange("", false)}
        >
          {coverUpdatingId === "all" ? "Usuwanie…" : "Usuń okładkę karty"}
        </Button>
      ) : null}

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
            disabled={uploading || Boolean(pendingImage)}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-1.5 h-4 w-4" />
            )}
            {uploading ? "Przesyłanie…" : "Dodaj zdjęcie lub film"}
          </Button>

          {pendingImage && pendingPreviewUrl ? (
            <div className="rounded-xl border border-border/70 bg-surface/40 p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingPreviewUrl}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-lg border border-border/60 object-cover"
                />
                <div className="grid min-w-0 flex-1 gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{pendingImage.name}</p>
                  <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-foreground/90">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={setAsCardCover}
                      onChange={(event) => setSetAsCardCover(event.target.checked)}
                    />
                    <span>Pokaż jako okładkę karty na tablicy</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploading}
                      onClick={() => void handleConfirmImageUpload()}
                    >
                      {uploading ? "Przesyłanie…" : "Prześlij zdjęcie"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={uploading}
                      onClick={clearPendingImage}
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

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

function KanbanAttachmentTile({
  attachment,
  canManageCover,
  coverUpdating,
  coverActionsDisabled,
  onSetCover,
}: {
  attachment: KanbanAttachment;
  canManageCover: boolean;
  coverUpdating: boolean;
  coverActionsDisabled: boolean;
  onSetCover?: (isCardCover: boolean) => Promise<void>;
}) {
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
      <div className="overflow-hidden rounded-xl border border-border/70 bg-surface/40">
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="relative block transition hover:opacity-95"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="aspect-[4/3] w-full object-cover"
          />
          {attachment.isCardCover ? (
            <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground shadow-sm">
              Okładka
            </span>
          ) : null}
        </a>
        {canManageCover && onSetCover ? (
          <div className="border-t border-border/60 p-1.5">
            <Button
              type="button"
              size="sm"
              variant={attachment.isCardCover ? "secondary" : "default"}
              className="h-8 w-full text-xs"
              disabled={coverActionsDisabled}
              onClick={() => void onSetCover(!attachment.isCardCover)}
            >
              {coverUpdating
                ? "Zapisywanie…"
                : attachment.isCardCover
                  ? "Usuń okładkę"
                  : "Ustaw jako okładkę"}
            </Button>
          </div>
        ) : null}
      </div>
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
  const cover =
    attachments.find((entry) => entry.isCardCover && entry.mediaKind === "image" && entry.url) ?? null;
  if (!cover?.url) {
    return null;
  }

  const imageCount = attachments.filter((entry) => entry.mediaKind === "image").length;

  return (
    <div className={cn("mb-2 overflow-hidden rounded-lg border border-border/50", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover.url} alt="" className="aspect-[16/9] w-full object-cover" />
      {imageCount > 1 ? (
        <p className="bg-surface/60 px-2 py-0.5 text-[10px] text-muted">+{imageCount - 1} zdjęć</p>
      ) : null}
    </div>
  );
}
