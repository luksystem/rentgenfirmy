"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  attachSignedUrlsToServicePhotos,
  deleteServicePhotoFromStorage,
  uploadServicePhoto,
} from "@/lib/service/service-photos";
import type { ServicePhoto } from "@/lib/service/types";
import { cn } from "@/lib/utils";

export function ServicePhotosField({
  serviceId,
  photos,
  onChange,
  label = "Zdjęcia do raportu",
  hint = "Dodaj zdjęcia z serwisu — pojawią się w wycenie / rozliczeniu jako czytelne miniaturki.",
}: {
  serviceId: string;
  photos: ServicePhoto[];
  onChange: (photos: ServicePhoto[]) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!photos.length) {
      return;
    }

    let cancelled = false;
    void attachSignedUrlsToServicePhotos(photos).then((entries) => {
      if (cancelled) {
        return;
      }
      setPreviewUrls((current) => {
        const next = { ...current };
        for (const entry of entries) {
          if (entry.url && !(next[entry.id]?.startsWith("blob:"))) {
            next[entry.id] = entry.url;
          }
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [photos]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploaded: ServicePhoto[] = [];
      const newPreviews: Record<string, string> = {};

      for (const file of Array.from(fileList)) {
        const photo = await uploadServicePhoto(serviceId, file);
        uploaded.push(photo);
        newPreviews[photo.id] = URL.createObjectURL(file);
      }

      setPreviewUrls((current) => ({ ...current, ...newPreviews }));
      onChange([...photos, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function removePhoto(photo: ServicePhoto) {
    if (!window.confirm("Usunąć to zdjęcie?")) {
      return;
    }

    setError(null);
    try {
      await deleteServicePhotoFromStorage(photo.storagePath);
      onChange(photos.filter((entry) => entry.id !== photo.id));
      setPreviewUrls((current) => {
        const next = { ...current };
        if (next[photo.id]) {
          URL.revokeObjectURL(next[photo.id]);
          delete next[photo.id];
        }
        return next;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć zdjęcia.");
    }
  }

  function updateCaption(photoId: string, caption: string) {
    onChange(
      photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)),
    );
  }

  return (
    <Field label={label}>
      <p className="mb-3 text-xs text-muted">{hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
          multiple
          className="hidden"
          onChange={(event) => void handleFilesSelected(event.target.files)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          Dodaj zdjęcie
        </Button>
        {photos.length ? (
          <span className="text-xs text-muted">{photos.length} w raporcie</span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      {photos.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-xl border border-border/70 bg-surface-muted/15"
            >
              <div className="relative aspect-[4/3] bg-surface-muted/30">
                {previewUrls[photo.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrls[photo.id]}
                    alt={photo.caption || photo.fileName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    Podgląd po zapisie oferty
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={() => void removePhoto(photo)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="p-2.5">
                <Input
                  value={photo.caption}
                  placeholder="Podpis pod zdjęciem (opcjonalnie)"
                  onChange={(event) => updateCaption(photo.id, event.target.value)}
                  className="text-xs"
                />
                <p className="mt-1 truncate text-[10px] text-muted">{photo.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={cn("mt-3 rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted")}>
          Brak zdjęć — możesz dodać np. stan instalacji, wykonane prace lub użyte elementy.
        </p>
      )}
    </Field>
  );
}
