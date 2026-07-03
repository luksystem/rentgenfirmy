"use client";

import { useEffect, useState } from "react";
import {
  attachSignedUrlsToServicePhotos,
  type ServicePhotoWithUrl,
} from "@/lib/service/service-photos";
import type { ServicePhoto } from "@/lib/service/types";
import { cn } from "@/lib/utils";

export function ServiceReportPhotosGrid({
  photos,
  className,
  printMode = false,
}: {
  photos: ServicePhoto[];
  className?: string;
  printMode?: boolean;
}) {
  const [resolved, setResolved] = useState<ServicePhotoWithUrl[]>([]);

  useEffect(() => {
    if (!photos.length) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    void attachSignedUrlsToServicePhotos(photos).then((entries) => {
      if (!cancelled) {
        setResolved(entries);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [photos]);

  if (!photos.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        printMode ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {resolved.map((photo) => (
        <figure
          key={photo.id}
          className={cn(
            "overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50",
            printMode && "break-inside-avoid",
          )}
        >
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={photo.caption || photo.fileName}
              className={cn(
                "w-full object-contain bg-white",
                printMode ? "min-h-[160px] max-h-[240px]" : "min-h-[180px] max-h-[280px]",
              )}
            />
          ) : (
            <div
              className={cn(
                "flex items-center justify-center bg-zinc-100 text-xs text-zinc-500",
                printMode ? "min-h-[160px]" : "min-h-[180px]",
              )}
            >
              Brak podglądu
            </div>
          )}
          {photo.caption ? (
            <figcaption className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-600">
              {photo.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
