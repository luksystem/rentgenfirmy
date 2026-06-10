"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import { KANBAN_DRAG_HINT, countOpenKanbanTasks, sortKanbanColumnTasks } from "@/lib/process/kanban-ui";
import {
  getKanbanPublicUrl,
  type KanbanAuthorSide,
  type KanbanBoard,
  type KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { cn } from "@/lib/utils";
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
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; columnId: string } | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [accessUsername, setAccessUsername] = useState("");
  const [accessAuthorName, setAccessAuthorName] = useState("");
  const [accessPasswordDraft, setAccessPasswordDraft] = useState("");
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!board) {
      return;
    }
    setAccessUsername(board.publicAccessUsername ?? "");
    setAccessAuthorName(board.publicAuthorName === "Klient" ? "" : board.publicAuthorName);
  }, [board?.id, board?.publicAccessUsername, board?.publicAuthorName]);

  async function handleSaveAccessSettings() {
    setAccessSaving(true);
    setAccessError(null);
    setAccessMessage(null);
    try {
      const response = await fetch("/api/process/kanban/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectProcessItemId,
          username: accessUsername.trim() || null,
          authorName: accessAuthorName.trim() || null,
          password: accessPasswordDraft.trim() ? accessPasswordDraft : undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zapisać ustawień dostępu.");
      }
      const payload = (await response.json()) as { board?: KanbanBoard };
      if (payload.board) {
        setBoard(payload.board);
      } else {
        await refresh();
      }
      setAccessPasswordDraft("");
      setAccessMessage("Ustawienia dostępu zapisane.");
    } catch (saveError) {
      setAccessError(saveError instanceof Error ? saveError.message : "Błąd zapisu dostępu.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleClearAccessPassword() {
    setAccessSaving(true);
    setAccessError(null);
    setAccessMessage(null);
    try {
      const response = await fetch("/api/process/kanban/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectProcessItemId,
          password: null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się usunąć hasła.");
      }
      await refresh();
      setAccessMessage("Hasło usunięte — wraca wpisywanie imienia na linku.");
    } catch (clearError) {
      setAccessError(clearError instanceof Error ? clearError.message : "Błąd usuwania hasła.");
    } finally {
      setAccessSaving(false);
    }
  }

  const activeTask = board?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const dragTask = dragTaskId ? (board?.tasks.find((task) => task.id === dragTaskId) ?? null) : null;
  const activeComments = board?.comments.filter((c) => c.taskId === activeTaskId) ?? [];
  const activeEvents = board?.events.filter((event) => event.taskId === activeTaskId) ?? [];
  const activeAttachments = board?.attachments.filter((entry) => entry.taskId === activeTaskId) ?? [];

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
    const taskId = dragTaskId;
    setPendingMove({ taskId, columnId });
    clearDragState();
    try {
      const columnTasks = board.tasks.filter(
        (task) => task.columnId === columnId && !task.closedAt && task.id !== taskId,
      );
      await moveKanbanTask(taskId, columnId, columnTasks.length);
      await refresh();
    } finally {
      setPendingMove(null);
    }
  }

  function clearDragState() {
    setDragTaskId(null);
    setDragOverColumnId(null);
  }

  function getColumnTasks(columnId: string) {
    if (!board) {
      return [];
    }
    return board.tasks.filter((task) => {
      if (pendingMove?.taskId === task.id) {
        return pendingMove.columnId === columnId;
      }
      return task.columnId === columnId;
    });
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
        <div className="grid shrink-0 gap-3 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
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

          <div className="grid gap-3 rounded-xl border border-border/60 bg-surface/40 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Hasło dostępu klienta</p>
              <p className="mt-1 text-xs text-muted">
                {board.publicAccessConfigured
                  ? "Link wymaga hasła (i opcjonalnie loginu). Podaj dane klientowi przy wdrożeniu."
                  : "Brak hasła — klient podaje imię przy wejściu. Ustaw hasło, aby zabezpieczyć tablicę."}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Nowe hasło">
                <Input
                  type="password"
                  value={accessPasswordDraft}
                  placeholder={board.publicAccessConfigured ? "Zostaw puste, aby nie zmieniać" : "Hasło dla klienta"}
                  autoComplete="new-password"
                  onChange={(event) => setAccessPasswordDraft(event.target.value)}
                />
              </Field>
              <Field label="Login (opcjonalnie)">
                <Input
                  value={accessUsername}
                  placeholder="Wymagany login klienta"
                  autoComplete="username"
                  onChange={(event) => setAccessUsername(event.target.value)}
                />
              </Field>
              <Field label="Nazwa w historii (bez loginu)" className="md:col-span-2">
                <Input
                  value={accessAuthorName}
                  placeholder={board.publicAuthorName}
                  onChange={(event) => setAccessAuthorName(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={accessSaving} onClick={() => void handleSaveAccessSettings()}>
                {accessSaving ? "Zapisywanie…" : "Zapisz dostęp"}
              </Button>
              {board.publicAccessConfigured ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={accessSaving}
                  onClick={() => void handleClearAccessPassword()}
                >
                  Usuń hasło
                </Button>
              ) : null}
            </div>
            {accessMessage ? <p className="text-xs text-emerald-400">{accessMessage}</p> : null}
            {accessError ? <p className="text-xs text-rose-400">{accessError}</p> : null}
          </div>
        </div>
      ) : null}

      <p className="shrink-0 text-sm text-muted">{KANBAN_DRAG_HINT}</p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1 md:flex-row md:overflow-hidden">
        {board.columns.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          const tasks = sortKanbanColumnTasks(columnTasks);
          const openCount = countOpenKanbanTasks(columnTasks);
          const isDropTarget = Boolean(dragTaskId && dragOverColumnId === column.id);

          return (
            <div
              key={column.id}
              className={cn(
                "flex min-h-[280px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 bg-surface-muted/30 md:min-h-0",
                getKanbanColumnDropTargetClasses(isDropTarget),
              )}
              onDragEnter={(event) => {
                if (!dragTaskId) {
                  return;
                }
                event.preventDefault();
                setDragOverColumnId(column.id);
              }}
              onDragOver={(event) => {
                if (!dragTaskId) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumnId(column.id);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(related)) {
                  setDragOverColumnId((current) => (current === column.id ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(column.id);
              }}
            >
              <div className="shrink-0 border-b border-border/60 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{column.title}</p>
                <p className="text-xs text-muted">{openCount} aktywnych</p>
              </div>

              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2",
                  isDropTarget && "bg-accent/[0.03]",
                )}
              >
                {tasks.map((task) => (
                  <KanbanTaskCardView
                    key={task.id}
                    task={task}
                    attachments={board.attachments.filter((entry) => entry.taskId === task.id)}
                    isNew={task.isNewForTeam && authorSide === "team"}
                    isDragging={dragTaskId === task.id}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={clearDragState}
                  />
                ))}

                {isDropTarget && dragTask ? <KanbanDropPlaceholder title={dragTask.title} /> : null}

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
          events={activeEvents}
          attachments={activeAttachments}
          authorName={authorName}
          canDelete={authorSide === "team"}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={async (patch) => {
            await updateKanbanTask(activeTask.id, patch);
            await refresh();
          }}
          onCloseTask={async (closed) => {
            await closeKanbanTask(activeTask.id, closed, { authorName, authorSide });
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
