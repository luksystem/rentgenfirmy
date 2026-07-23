"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RichHtml } from "@/components/ui/rich-html";
import { YoutubeEmbed } from "@/components/smart-home-kb/youtube-embed";
import { KbArticleFormDialog } from "@/components/smart-home-kb/kb-article-form-dialog";
import { KbFaqSection } from "@/components/smart-home-kb/kb-faq-section";
import { isStaffRole } from "@/lib/permissions/can-module-action";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";
import { useAuthStore } from "@/store/auth-store";

export default function SmartHomeKnowledgeBaseArticlePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const role = useAuthStore((state) => state.profile?.role);
  const canManage = role ? isStaffRole(role) : false;

  const ensure = useSmartHomeKbStore((state) => state.ensure);
  const articles = useSmartHomeKbStore((state) => state.articles);
  const categories = useSmartHomeKbStore((state) => state.categories);
  const tags = useSmartHomeKbStore((state) => state.tags);
  const faqItems = useSmartHomeKbStore((state) => state.faqItems);
  const hydrated = useSmartHomeKbStore((state) => state.hydrated);
  const removeArticle = useSmartHomeKbStore((state) => state.removeArticle);

  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  const article = useMemo(
    () => articles.find((item) => item.slug === params.slug) ?? null,
    [articles, params.slug],
  );

  const category = article?.categoryId
    ? (categories.find((item) => item.id === article.categoryId) ?? null)
    : null;
  const articleTags = article
    ? article.tagIds.map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    : [];
  const relatedFaq = article?.categoryId
    ? faqItems.filter(
        (faq) => faq.categoryId === article.categoryId && (canManage || faq.status === "published"),
      )
    : [];

  async function handleDelete() {
    if (!article || !window.confirm(`Usunąć artykuł "${article.title}"?`)) {
      return;
    }
    await removeArticle(article.id);
    router.push("/wiedza-smart-home");
  }

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!article) {
    return (
      <>
        <PageHeader eyebrow="Wiedza" title="Nie znaleziono artykułu" />
        <Button asChild variant="outline">
          <Link href="/wiedza-smart-home">
            <ArrowLeft className="h-4 w-4" />
            Wróć do bazy wiedzy
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/wiedza-smart-home"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Wróć do bazy wiedzy
      </Link>

      <PageHeader
        eyebrow={category?.name ?? "Wiedza Smart Home"}
        title={article.title}
        description={article.summary || undefined}
        action={
          canManage ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edytuj
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleDelete()}>
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                Usuń
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6">
        {article.status === "draft" ? <Badge tone="waiting">Szkic — niewidoczny dla klientów</Badge> : null}

        {article.youtubeUrl ? (
          <YoutubeEmbed url={article.youtubeUrl} />
        ) : article.coverImageUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image src={article.coverImageUrl} alt={article.title} fill sizes="800px" className="object-cover" unoptimized />
          </div>
        ) : null}

        {articleTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {articleTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-border bg-surface-muted/40 px-2 py-0.5 text-xs text-muted"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        <Card>
          <div className="p-5">
            <RichHtml html={article.bodyHtml} variant="document" fallback="Brak treści." />
          </div>
        </Card>

        {article.media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {article.media.map((item) =>
              item.url ? (
                <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <Image src={item.url} alt={item.fileName} fill sizes="200px" className="object-cover" unoptimized />
                </div>
              ) : null,
            )}
          </div>
        ) : null}

        {relatedFaq.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="text-base font-semibold text-foreground">Powiązane pytania</h3>
            <KbFaqSection faqItems={relatedFaq} categories={categories} canManage={canManage} />
          </div>
        ) : null}
      </div>

      <KbArticleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        article={article}
        categories={categories}
        tags={tags}
      />
    </>
  );
}
