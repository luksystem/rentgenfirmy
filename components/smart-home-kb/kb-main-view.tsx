"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { KbFilters } from "@/components/smart-home-kb/kb-filters";
import { KbArticleCard } from "@/components/smart-home-kb/kb-article-card";
import { KbArticleFormDialog } from "@/components/smart-home-kb/kb-article-form-dialog";
import { KbFaqSection } from "@/components/smart-home-kb/kb-faq-section";
import { KbTaxonomyManagerDialog } from "@/components/smart-home-kb/kb-taxonomy-manager-dialog";
import { KbAiSettingsDialog } from "@/components/smart-home-kb/kb-ai-settings-dialog";
import { KbAiSearchBox } from "@/components/smart-home-kb/kb-ai-search-box";
import { KbClientPathView } from "@/components/smart-home-kb/kb-client-path-view";
import { isStaffRole } from "@/lib/permissions/can-module-action";
import type { SmartHomeKbArticle } from "@/lib/smart-home-kb/types";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";
import { useSmartHomeKbPathsStore } from "@/store/smart-home-kb-paths-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type ViewMode = "articles" | "faq";

export function KbMainView() {
  const role = useAuthStore((state) => state.profile?.role);
  const clientId = useAuthStore((state) => state.profile?.clientId ?? null);
  const canManage = role ? isStaffRole(role) : false;

  const ensureClientPaths = useSmartHomeKbPathsStore((state) => state.ensureClientPaths);
  const clientPaths = useSmartHomeKbPathsStore((state) =>
    clientId ? state.clientPathsByClientId[clientId] : undefined,
  );

  const ensure = useSmartHomeKbStore((state) => state.ensure);
  const search = useSmartHomeKbStore((state) => state.search);
  const categories = useSmartHomeKbStore((state) => state.categories);
  const tags = useSmartHomeKbStore((state) => state.tags);
  const articles = useSmartHomeKbStore((state) => state.articles);
  const faqItems = useSmartHomeKbStore((state) => state.faqItems);
  const isLoading = useSmartHomeKbStore((state) => state.isLoading);
  const hydrated = useSmartHomeKbStore((state) => state.hydrated);
  const removeArticle = useSmartHomeKbStore((state) => state.removeArticle);

  const [view, setView] = useState<ViewMode>("articles");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [articleFormOpen, setArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SmartHomeKbArticle | null>(null);
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  useEffect(() => {
    if (role === "klient" && clientId) {
      void ensureClientPaths(clientId);
    }
  }, [role, clientId, ensureClientPaths]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void search(query);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query, search]);

  const visibleArticles = useMemo(() => {
    return articles
      .filter((article) => canManage || article.status === "published")
      .filter((article) => !categoryId || article.categoryId === categoryId)
      .filter((article) => tagIds.length === 0 || tagIds.every((id) => article.tagIds.includes(id)));
  }, [articles, canManage, categoryId, tagIds]);

  const visibleFaqItems = useMemo(() => {
    return faqItems
      .filter((faq) => canManage || faq.status === "published")
      .filter((faq) => !categoryId || faq.categoryId === categoryId);
  }, [faqItems, canManage, categoryId]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]));
  }

  async function handleDeleteArticle(article: SmartHomeKbArticle) {
    if (!window.confirm(`Usunąć artykuł "${article.title}"?`)) {
      return;
    }
    await removeArticle(article.id);
  }

  const isKlientWithClient = role === "klient" && Boolean(clientId);
  const pathsLoading = isKlientWithClient && clientPaths === undefined;
  const activePaths = (clientPaths ?? []).filter((path) => path.status === "active");
  const showClientPathView = isKlientWithClient && activePaths.length > 0;

  if (pathsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (showClientPathView && clientId) {
    return (
      <>
        <PageHeader
          eyebrow="Wiedza"
          title="Twoja ścieżka szkoleniowa"
          description="Przejdź przez materiały w podanej kolejności — możesz odznaczać ukończone kroki."
        />
        <div className="mb-6">
          <KbAiSearchBox />
        </div>
        <KbClientPathView clientId={clientId} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Wiedza"
        title="Wiedza Smart Home"
        description="Poradniki, filmy instruktażowe i najczęstsze pytania — samodzielna baza wiedzy zastępująca część szkolenia na miejscu."
        action={
          canManage ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setTaxonomyOpen(true)}>
                <Settings2 className="h-3.5 w-3.5" />
                Kategorie i tagi
              </Button>
              {isAdministrator ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setAiSettingsOpen(true)}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Ustawienia AI
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingArticle(null);
                  setArticleFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj artykuł
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("articles")}
          className={cn(
            "rounded-xl border px-4 py-2 text-sm font-medium transition",
            view === "articles"
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-border bg-surface-muted/30 text-muted hover:text-foreground",
          )}
        >
          Poradniki
        </button>
        <button
          type="button"
          onClick={() => setView("faq")}
          className={cn(
            "rounded-xl border px-4 py-2 text-sm font-medium transition",
            view === "faq"
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-border bg-surface-muted/30 text-muted hover:text-foreground",
          )}
        >
          FAQ
        </button>
      </div>

      <div className="mb-5">
        <KbFilters
          query={query}
          onQueryChange={setQuery}
          categories={categories}
          activeCategoryId={categoryId}
          onCategoryChange={setCategoryId}
          tags={tags}
          activeTagIds={tagIds}
          onTagToggle={toggleTag}
        />
      </div>

      {isLoading && !hydrated ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : view === "articles" ? (
        visibleArticles.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Brak artykułów spełniających kryteria.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article) => (
              <KbArticleCard
                key={article.id}
                article={article}
                category={article.categoryId ? (categoryById.get(article.categoryId) ?? null) : null}
                tags={article.tagIds.map((id) => tagById.get(id)).filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))}
                canManage={canManage}
                onEdit={() => {
                  setEditingArticle(article);
                  setArticleFormOpen(true);
                }}
                onDelete={() => void handleDeleteArticle(article)}
              />
            ))}
          </div>
        )
      ) : (
        <KbFaqSection faqItems={visibleFaqItems} categories={categories} canManage={canManage} />
      )}

      <KbArticleFormDialog
        open={articleFormOpen}
        onOpenChange={setArticleFormOpen}
        article={editingArticle}
        categories={categories}
        tags={tags}
      />
      <KbTaxonomyManagerDialog
        open={taxonomyOpen}
        onOpenChange={setTaxonomyOpen}
        categories={categories}
        tags={tags}
      />
      <KbAiSettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </>
  );
}
