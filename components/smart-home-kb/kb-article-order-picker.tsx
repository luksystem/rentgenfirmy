"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SmartHomeKbArticle } from "@/lib/smart-home-kb/types";

/** Lista wybranych artykułów w ustalonej kolejności + wyszukiwarka do dodawania kolejnych. */
export function KbArticleOrderPicker({
  allArticles,
  selectedArticleIds,
  onChange,
}: {
  allArticles: SmartHomeKbArticle[];
  selectedArticleIds: string[];
  onChange: (articleIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const articleById = new Map(allArticles.map((article) => [article.id, article]));

  const availableArticles = allArticles.filter(
    (article) =>
      !selectedArticleIds.includes(article.id) &&
      (query.trim().length === 0 || article.title.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function move(index: number, direction: -1 | 1) {
    const next = [...selectedArticleIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(articleId: string) {
    onChange(selectedArticleIds.filter((id) => id !== articleId));
  }

  function add(articleId: string) {
    onChange([...selectedArticleIds, articleId]);
    setQuery("");
  }

  return (
    <div className="grid gap-3">
      {selectedArticleIds.length > 0 ? (
        <ol className="grid gap-1.5">
          {selectedArticleIds.map((articleId, index) => {
            const article = articleById.get(articleId);
            return (
              <li
                key={articleId}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/20 px-3 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {article?.title ?? "Usunięty artykuł"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Przesuń wyżej"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === selectedArticleIds.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Przesuń niżej"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(articleId)} aria-label="Usuń">
                    <X className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted">Brak artykułów w tej ścieżce — dodaj poniżej.</p>
      )}

      <div className="grid gap-2 rounded-xl border border-dashed border-border p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj artykułu do dodania..."
        />
        <div className="grid max-h-48 gap-1 overflow-y-auto">
          {availableArticles.slice(0, 20).map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => add(article.id)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate">{article.title}</span>
            </button>
          ))}
          {availableArticles.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted">Brak wyników.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
