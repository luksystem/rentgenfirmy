"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import {
  KANBAN_PRIORITIES,
  KANBAN_PRIORITY_LABELS,
  getKanbanPublicUrl,
  type KanbanAuthorSide,
  type KanbanBoard,
  type KanbanPriority,
  type KanbanTask,
  type KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import {
  addKanbanComment,
  closeKanbanTask,
  createKanbanTask,
  ensureKanbanBoard,
  fetchKanbanBoardByItemId,
  markKanbanBoardRead,
  moveKanbanTask,
  setKanbanPublicEnabled,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";
import { cn } from "@/lib/utils";

function priorityClass(priority: KanbanPriority) {
  switch (priority) {
    case "urgent":
      return "border-rose-500/40 bg-rose-500/10 text-rose-200";
    case "high":
      return "border-orange-500/40 bg-orange-500/10 text-orange-200";
    case "low":
      return "border-border/60 bg-surface/40 text-muted";
    default:
      return "border-border/70 bg-surface/60 text-foreground";
  }
}

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
    await createKanbanTask({ columnId, title, authorSide, authorName });
    setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
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
    <div className="grid gap-4">
      {showPublicLink ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
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

      <div className="flex gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => {
          const tasks = board.tasks
            .filter((task) => task.columnId === column.id && !task.closedAt)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={column.id}
              className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/80 bg-surface-muted/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column.id)}
            >
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{column.title}</p>
                <p className="text-xs text-muted">{tasks.length} aktywnych</p>
              </div>

              <div className="grid flex-1 gap-2 p-2">
                {tasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    isNew={task.isNewForTeam && authorSide === "team"}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                  />
                ))}

                <div className="grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
                  <Input
                    value={newTaskTitles[column.id] ?? ""}
                    placeholder="Nowy task…"
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
        <KanbanTaskDetail
          task={activeTask}
          comments={activeComments}
          authorName={authorName}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={async (patch) => {
            await updateKanbanTask(activeTask.id, patch);
            await refresh();
          }}
          onCloseTask={async (closed) => {
            await closeKanbanTask(activeTask.id, closed);
            setActiveTaskId(null);
            await refresh();
          }}
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

function KanbanTaskCard({
  task,
  isNew,
  onOpen,
  onDragStart,
}: {
  task: KanbanTask;
  isNew: boolean;
  onOpen: () => void;
  onDragStart: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-left text-sm transition hover:border-accent/30",
        priorityClass(task.priority),
        isNew && "ring-2 ring-rose-500/50",
      )}
    >
      <p className="font-medium">{task.title}</p>
      <p className="mt-1 text-[11px] opacity-80">
        {KANBAN_PRIORITY_LABELS[task.priority]}
        {task.dueDate ? ` · ${task.dueDate}` : ""}
        {isNew ? " · NOWY" : ""}
      </p>
    </button>
  );
}

function KanbanTaskDetail({
  task,
  comments,
  authorName,
  commentDraft,
  onCommentDraftChange,
  onClose,
  onSave,
  onCloseTask,
  onComment,
}: {
  task: KanbanTask;
  comments: KanbanBoard["comments"];
  authorName: string;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: (patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate">>) => Promise<void>;
  onCloseTask: (closed: boolean) => Promise<void>;
  onComment: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Szczegóły taska</h3>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Field label="Tytuł">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Opis">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Priorytet">
            <Select value={priority} onChange={(event) => setPriority(event.target.value as KanbanPriority)}>
              {KANBAN_PRIORITIES.map((entry) => (
                <option key={entry} value={entry}>
                  {KANBAN_PRIORITY_LABELS[entry]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Termin">
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void onSave({
                title,
                description,
                priority,
                dueDate: dueDate || null,
              })
            }
          >
            Zapisz
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onCloseTask(true)}>
            Zamknij task
          </Button>
        </div>

        <div className="grid gap-2 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-foreground">Komentarze</p>
          <div className="grid max-h-48 gap-2 overflow-y-auto">
            {comments.length ? (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-sm">
                  <p className="text-xs text-muted">
                    {comment.authorName} · {comment.authorSide === "client" ? "Klient" : "Zespół"}
                  </p>
                  <p className="mt-1 text-foreground">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Brak komentarzy.</p>
            )}
          </div>
          <Textarea
            value={commentDraft}
            placeholder={`Komentarz (${authorName})…`}
            onChange={(event) => onCommentDraftChange(event.target.value)}
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => void onComment()}>
            Dodaj komentarz
          </Button>
        </div>
      </div>
    </div>
  );
}
