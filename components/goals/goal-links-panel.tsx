"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addGoalLink, fetchGoalLinks, removeGoalLink } from "@/lib/supabase/goal-repository";
import type { GoalLink } from "@/lib/goals/types";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";

type FlatTask = {
  id: string;
  title: string;
  projectName: string;
  projectId: string | null;
  closedAt: string | null;
};

export function GoalLinksPanel({ goalId, projectId }: { goalId: string; projectId: string | null }) {
  const allBoards = useKanbanCacheStore((state) => state.allBoards);
  const ensureAllBoards = useKanbanCacheStore((state) => state.ensureAllBoards);
  const boardsLoading = useKanbanCacheStore((state) => state.boardsLoading);

  const [links, setLinks] = useState<GoalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    void ensureAllBoards();
  }, [ensureAllBoards]);

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      setLinks(await fetchGoalLinks(goalId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać powiązań.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  const allTasks = useMemo<FlatTask[]>(() => {
    if (!allBoards) return [];
    return allBoards.flatMap((board) =>
      board.tasks
        .filter((task) => !task.closedAt)
        .map((task) => ({
          id: task.id,
          title: task.title,
          projectName: board.projectName,
          projectId: board.projectId,
          closedAt: task.closedAt,
        })),
    );
  }, [allBoards]);

  const tasksById = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);

  const linkedTaskLinks = useMemo(
    () => links.filter((link) => link.linkedType === "kanban_task"),
    [links],
  );
  const linkedTaskIds = useMemo(
    () => new Set(linkedTaskLinks.map((link) => link.linkedId)),
    [linkedTaskLinks],
  );
  const otherLinks = useMemo(() => links.filter((link) => link.linkedType !== "kanban_task"), [links]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return allTasks
      .filter((task) => !linkedTaskIds.has(task.id))
      .filter((task) => task.title.toLowerCase().includes(query))
      .sort((a, b) => {
        const aOwn = a.projectId === projectId ? 0 : 1;
        const bOwn = b.projectId === projectId ? 0 : 1;
        return aOwn - bOwn;
      })
      .slice(0, 15);
  }, [allTasks, search, linkedTaskIds, projectId]);

  async function handleLink(taskId: string) {
    setLinking(taskId);
    try {
      await addGoalLink({ goalId, linkedType: "kanban_task", linkedId: taskId });
      setSearch("");
      await loadLinks();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Nie udało się dodać powiązania.");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlink(linkId: string) {
    try {
      await removeGoalLink(linkId);
      await loadLinks();
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Nie udało się usunąć powiązania.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie powiązań...
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Powiązane zadania Kanban ({linkedTaskLinks.length})
          </p>
          {linkedTaskLinks.length === 0 ? (
            <p className="text-sm text-muted">Brak powiązanych zadań.</p>
          ) : (
            <div className="grid gap-2">
              {linkedTaskLinks.map((link) => {
                const task = tasksById.get(link.linkedId);
                return (
                  <div
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-muted" />
                      <div>
                        <p className="font-medium text-foreground">{task?.title ?? "Zadanie usunięte"}</p>
                        {task ? <p className="text-xs text-muted">{task.projectName}</p> : null}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void handleUnlink(link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {otherLinks.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Inne powiązania</p>
            <div className="grid gap-2">
              {otherLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3 text-sm"
                >
                  <Badge tone="neutral">{link.linkedType}</Badge>
                  <span className="text-muted">{link.linkedId}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void handleUnlink(link.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-border/60 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Dodaj istniejące zadanie Kanban
          </p>
          <Input
            placeholder={boardsLoading ? "Wczytywanie zadań..." : "Szukaj zadania po tytule..."}
            value={search}
            disabled={boardsLoading}
            onChange={(event) => setSearch(event.target.value)}
          />
          {searchResults.length > 0 ? (
            <div className="mt-2 grid gap-1.5">
              {searchResults.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  disabled={linking === task.id}
                  onClick={() => void handleLink(task.id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface-muted/10 px-3 py-2 text-left text-sm transition hover:border-accent/40 hover:bg-surface-muted/30 disabled:opacity-50"
                >
                  <span className="text-foreground/90">{task.title}</span>
                  <span className="text-xs text-muted">{task.projectName}</span>
                </button>
              ))}
            </div>
          ) : null}
          {search.trim() && searchResults.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Brak zadań spełniających kryteria wyszukiwania.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
