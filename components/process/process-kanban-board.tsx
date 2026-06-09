"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import { KANBAN_DRAG_HINT } from "@/lib/process/kanban-ui";
import {
  getKanbanPublicUrl,
  type KanbanAuthorSide,
  type KanbanBoard,
  type KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import {
  addKanbanComment,
  closeKanbanTask,
  createKanbanTask,
  deleteKanbanTask,
  ensureKanbanBoard,
  fetchKanbanBoardByItemId,
  markKanbanBoardRead,
  moveKanbanTask,
  setKanbanPublicEnabled,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";

export function ProcessKanbanBoard({
  projectProcessItemId,
  templatePayload,
  authorSide,
  authorName,
  showPublicLink = false,
}: {
  projectProcessItemId: string;
  templatePayload: KanbanTemplatePayload | unknown;
  authorSide: KanbanAuthorSide;
  authorName: string;
  showPublicLink?: boolean;
}) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [newTaskDueDates, setNewTaskDueDates] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const template = isKanbanTemplatePayload(templatePayload)
      ? templatePayload
      : { columns: [] };
    const loaded =
      (await fetchKanbanBoardByItemId(projectProcessItemId)) ??
      (await ensureKanbanBoard(projectProcessItemId, template));
    setBoard(loaded);
    if (authorSide === "team" && loaded) {
      await markKanbanBoardRead(loaded.id);
    }
  }, [authorSide, projectProcessItemId, templatePayload]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useKanbanRealtime(board?.id ?? null, refresh);

  const activeTask = board?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeComments = board?.comments.filter((c) => c.taskId === activeTaskId) ?? [];

  async function handleAddTask(columnId: string) {
    const title = newTaskTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    const dueDate = newTaskDueDates[columnId]?.trim() || null;
    await createKanbanTask({ columnId, title, dueDate, authorSide, authorName });
    setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
    setNewTaskDueDates((current) => ({ ...current, [columnId]: "" }));
    await refresh();
  }

  async function handleDrop(columnId: string) {
    if (!dragTaskId || !board) {
      return;
    }
    const columnTasks = board.tasks.filter((t) => t.columnId === columnId && !t.closedAt);
    await moveKanbanTask(dragTaskId, columnId, columnTasks.length);
    setDragTaskId(null);
    await refresh();
  }

  async function handleTogglePublic(enabled: boolean) {
    await setKanbanPublicEnabled(projectProcessItemId, enabled);
    await refresh();
  }

  async function copyPublicLink() {
    if (!board?.publicToken) {
      return;
    }
    const url = getKanbanPublicUrl(board.publicToken);
    await navigator.clipboard.writeText(url);
    setLinkMessage("Link skopiowany.");
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie tablicy Kanban…</p>;
  }

  if (error || !board) {
    return <p className="text-sm text-rose-400">{error ?? "Nie udało się załadować tablicy."}</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {showPublicLink ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
          <Button
            type="button"
            size="sm"
            variant={board.publicEnabled ? "default" : "secondary"}
            onClick={() => void handleTogglePublic(!board.publicEnabled)}
          >
            {board.publicEnabled ? "Link publiczny włączony" : "Włącz link publiczny"}
          </Button>
          {board.publicEnabled ? (
            <>
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyPublicLink()}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Kopiuj link
              </Button>
              <a
                href={getKanbanPublicUrl(board.publicToken)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Podgląd publiczny
              </a>
            </>
          ) : null}
          {linkMessage ? <span className="text-xs text-emerald-400">{linkMessage}</span> : null}
        </div>
      ) : null}

      <p className="shrink-0 text-sm text-muted">{KANBAN_DRAG_HINT}</p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1 md:flex-row md:overflow-hidden">
        {board.columns.map((column) => {
          const tasks = board.tasks
            .filter((task) => task.columnId === column.id && !task.closedAt)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={column.id}
              className="flex min-h-[280px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 bg-surface-muted/30 md:min-h-0"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column.id)}
            >
              <div className="shrink-0 border-b border-border/60 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{column.title}</p>
                <p className="text-xs text-muted">{tasks.length} aktywnych</p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {tasks.map((task) => (
                  <KanbanTaskCardView
                    key={task.id}
                    task={task}
                    isNew={task.isNewForTeam && authorSide === "team"}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                  />
                ))}

                <div className="mt-auto grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
                  <Input
                    value={newTaskTitles[column.id] ?? ""}
                    placeholder="Nowe zgłoszenie…"
                    onChange={(event) =>
                      setNewTaskTitles((current) => ({
                        ...current,
                        [column.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleAddTask(column.id);
                      }
                    }}
                  />
                  <Field label="Termin (opcjonalnie)" className="text-xs">
                    <Input
                      type="date"
                      value={newTaskDueDates[column.id] ?? ""}
                      onChange={(event) =>
                        setNewTaskDueDates((current) => ({
                          ...current,
                          [column.id]: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void handleAddTask(column.id)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Dodaj
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activeTask ? (
        <KanbanTaskDetailModal
          task={activeTask}
          comments={activeComments}
          authorName={authorName}
          canDelete={authorSide === "team"}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={async (patch) => {
            await updateKanbanTask(activeTask.id, patch);
            await refresh();
          }}
          onCloseTask={async () => {
            await closeKanbanTask(activeTask.id, true);
            setActiveTaskId(null);
            await refresh();
          }}
          onDelete={
            authorSide === "team"
              ? async () => {
                  await deleteKanbanTask(activeTask.id);
                  setActiveTaskId(null);
                  await refresh();
                }
              : undefined
          }
          onComment={async () => {
            await addKanbanComment({
              taskId: activeTask.id,
              authorName,
              authorSide,
              body: commentDraft,
            });
            setCommentDraft("");
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
