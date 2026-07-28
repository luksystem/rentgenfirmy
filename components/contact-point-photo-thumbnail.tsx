"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getTradeContactPointPhotoUrl } from "@/lib/supabase/trade-contact-point-repository";
import { cn } from "@/lib/utils";

export function ContactPointPhotoThumbnail({
  storagePath,
  className,
}: {
  storagePath: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTradeContactPointPhotoUrl(storagePath).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!url) {
    return (
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-muted/30",
          className,
        )}
      >
        <ImageOff className="h-5 w-5 text-muted" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={cn("h-16 w-16 shrink-0 rounded-lg border border-border/70 object-cover", className)}
    />
  );
}
