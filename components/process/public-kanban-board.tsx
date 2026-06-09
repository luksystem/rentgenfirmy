"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  KANBAN_PRIORITY_LABELS,
  type KanbanBoard,
  type KanbanPriority,
  type KanbanTask,
} from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";

async function postKanban(token: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/kanban/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Operacja nie powiodła się.");
  }
}

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

export function PublicKanbanBoard({
  token,
  board,
  authorName,
  onRefresh,
}: {
  token: string;
  board: KanbanBoard;
  authorName: string;
  onRefresh: () => Promise<void>;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const activeTask = board.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeComments = board.comments.filter((comment) => comment.taskId === activeTaskId);

  async function handleAddTask(columnId: string) {
    const title = newTaskTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    await postKanban(token, { action: "createTask", columnId, title, authorName });
    setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
    await onRefresh();
  }

  async function handleDrop(columnId: string) {
    if (!dragTaskId) {
      return;
    }
    const columnTasks = board.tasks.filter((task) => task.columnId === columnId && !task.closedAt);
    await postKanban(token, {
      action: "moveTask",
      taskId: dragTaskId,
      columnId,
      position: columnTasks.length,
      authorName,
    });
    setDragTaskId(null);
    await onRefresh();
  }

  return (
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
            <div className="grid gap-2 p-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragTaskId(task.id)}
                  onClick={() => setActiveTaskId(task.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm",
                    priorityClass(task.priority),
                  )}
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-[11px] opacity-80">
                    {KANBAN_PRIORITY_LABELS[task.priority]}
                    {task.dueDate ? ` · ${task.dueDate}` : ""}
                  </p>
                </button>
              ))}
              <div className="grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
                <Input
                  value={newTaskTitles[column.id] ?? ""}
                  placeholder="Nowy task…"
                  onChange={(event) =>
                    setNewTaskTitles((current) => ({ ...current, [column.id]: event.target.value }))
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

      {activeTask ? (
        <PublicKanbanTaskDetail
          token={token}
          task={activeTask}
          comments={activeComments}
          authorName={authorName}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onRefresh={onRefresh}
        />
      ) : null}
    </div>
  );
}

function PublicKanbanTaskDetail({
  token,
  task,
  comments,
  authorName,
  commentDraft,
  onCommentDraftChange,
  onClose,
  onRefresh,
}: {
  token: string;
  task: KanbanTask;
  comments: KanbanBoard["comments"];
  authorName: string;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {task.description ? <p className="text-sm text-muted">{task.description}</p> : null}
        <p className="text-xs text-muted">
          {KANBAN_PRIORITY_LABELS[task.priority]}
          {task.dueDate ? ` · termin ${task.dueDate}` : ""}
        </p>
        <div className="grid gap-2 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-foreground">Komentarze</p>
          <div className="grid max-h-48 gap-2 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-sm">
                <p className="text-xs text-muted">
                  {comment.authorName} · {comment.authorSide === "client" ? "Klient" : "Zespół"}
                </p>
                <p className="mt-1">{comment.body}</p>
              </div>
            ))}
          </div>
          <Textarea
            value={commentDraft}
            placeholder="Twój komentarz…"
            onChange={(event) => onCommentDraftChange(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              void (async () => {
                await postKanban(token, {
                  action: "addComment",
                  taskId: task.id,
                  body: commentDraft,
                  authorName,
                });
                onCommentDraftChange("");
                await onRefresh();
              })()
            }
          >
            Dodaj komentarz
          </Button>
        </div>
      </div>
    </div>
  );
}
