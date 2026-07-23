"use client";

import Link from "next/link";
import Image from "next/image";
import { PlayCircle, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildYoutubeThumbnailUrl } from "@/lib/smart-home-kb/youtube";
import type { SmartHomeKbArticle, SmartHomeKbCategory, SmartHomeKbTag } from "@/lib/smart-home-kb/types";

export function KbArticleCard({
  article,
  category,
  tags,
  canManage,
  onEdit,
  onDelete,
}: {
  article: SmartHomeKbArticle;
  category: SmartHomeKbCategory | null;
  tags: SmartHomeKbTag[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumbnail = article.youtubeUrl ? buildYoutubeThumbnailUrl(article.youtubeUrl) : null;
  const image = thumbnail ?? article.coverImageUrl;

  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/wiedza-smart-home/${article.slug}`} className="block">
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-surface-muted/40">
          {image ? (
            <Image src={image} alt={article.title} fill sizes="400px" className="object-cover" unoptimized />
          ) : (
            <span className="text-xs text-muted">Brak podglądu</span>
          )}
          {article.youtubeUrl ? (
            <PlayCircle className="absolute inset-0 m-auto h-10 w-10 text-white drop-shadow" />
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {article.status === "draft" ? <Badge tone="waiting">Szkic</Badge> : null}
        {category ? <Badge tone="blue">{category.name}</Badge> : null}

        <Link href={`/wiedza-smart-home/${article.slug}`}>
          <h3 className="line-clamp-2 text-base font-semibold text-foreground hover:underline">
            {article.title}
          </h3>
        </Link>

        {article.summary ? (
          <p className="line-clamp-2 text-sm text-muted">{article.summary}</p>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-border bg-surface-muted/40 px-2 py-0.5 text-xs text-muted"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {canManage ? (
          <div className="mt-auto flex justify-end gap-1.5 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edytuj
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
