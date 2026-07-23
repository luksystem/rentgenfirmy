"use client";

import { buildYoutubeEmbedUrl } from "@/lib/smart-home-kb/youtube";
import { cn } from "@/lib/utils";

export function YoutubeEmbed({ url, className }: { url: string; className?: string }) {
  const embedUrl = buildYoutubeEmbedUrl(url);
  if (!embedUrl) {
    return null;
  }

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-xl bg-black", className)}>
      <iframe
        src={embedUrl}
        title="Film YouTube"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
