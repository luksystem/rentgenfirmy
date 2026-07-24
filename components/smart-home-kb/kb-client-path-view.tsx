"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";
import { useSmartHomeKbPathsStore } from "@/store/smart-home-kb-paths-store";
import type { SmartHomeKbClientPath } from "@/lib/smart-home-kb/types";

const EMPTY_CLIENT_PATHS: SmartHomeKbClientPath[] = [];

export function KbClientPathView({ clientId }: { clientId: string }) {
  const ensureArticles = useSmartHomeKbStore((state) => state.ensure);
  const articles = useSmartHomeKbStore((state) => state.articles);

  const ensureClientPaths = useSmartHomeKbPathsStore((state) => state.ensureClientPaths);
  const paths = useSmartHomeKbPathsStore(
    (state) => state.clientPathsByClientId[clientId] ?? EMPTY_CLIENT_PATHS,
  );
  const toggleCompleted = useSmartHomeKbPathsStore((state) => state.toggleClientPathItemCompleted);

  useEffect(() => {
    void ensureArticles();
    void ensureClientPaths(clientId);
  }, [clientId, ensureArticles, ensureClientPaths]);

  const activePaths = paths.filter((path) => path.status === "active");
  const articleById = new Map(articles.map((article) => [article.id, article]));

  return (
    <div className="grid gap-6">
      {activePaths.map((path) => {
        const completedCount = path.items.filter((item) => item.completedAt).length;
        return (
          <Card key={path.id}>
            <CardContent className="grid gap-4 p-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{path.name}</h2>
                {path.description ? <p className="mt-1 text-sm text-muted">{path.description}</p> : null}
                <p className="mt-1 text-xs text-muted">
                  Ukończono {completedCount} z {path.items.length}
                </p>
              </div>

              <ol className="grid gap-2">
                {path.items.map((item, index) => {
                  const article = articleById.get(item.articleId);
                  const completed = Boolean(item.completedAt);
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                        completed ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-surface-muted/20",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void toggleCompleted(clientId, path.id, item.id, !completed)}
                        aria-label={completed ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
                        className="shrink-0"
                      >
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted" />
                        )}
                      </button>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                        {index + 1}
                      </span>
                      {article ? (
                        <Link
                          href={`/wiedza-smart-home/${article.slug}`}
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm hover:underline",
                            completed ? "text-muted line-through" : "text-foreground",
                          )}
                        >
                          {article.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-sm text-muted">Usunięty artykuł</span>
                      )}
                      {article?.youtubeUrl ? <PlayCircle className="h-4 w-4 shrink-0 text-muted" /> : null}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
