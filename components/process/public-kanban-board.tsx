"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { KANBAN_DRAG_HINT } from "@/lib/process/kanban-ui";
import type { KanbanBoard, KanbanTask } from "@/lib/process/kanban-types";

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
  const [newTaskDueDates, setNewTaskDueDates] = useState<Record<string, string>>({});
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const activeTask = board.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeComments = board.comments.filter((comment) => comment.taskId === activeTaskId);

  async function handleAddTask(columnId: string) {
    const title = newTaskTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    const dueDate = newTaskDueDates[columnId]?.trim() || null;
    await postKanban(token, { action: "createTask", columnId, title, dueDate, authorName });
    setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
    setNewTaskDueDates((current) => ({ ...current, [columnId]: "" }));
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

  async function handleSaveTask(
    taskId: string,
    patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate">>,
  ) {
    await postKanban(token, {
      action: "updateTask",
      taskId,
      authorName,
      ...patch,
    });
    await onRefresh();
  }

  async function handleCloseTask(taskId: string) {
    await postKanban(token, { action: "closeTask", taskId, authorName });
    setActiveTaskId(null);
    await onRefresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                  />
                ))}

                <div className="mt-auto grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
                  <Input
                    value={newTaskTitles[column.id] ?? ""}
                    placeholder="Nowe zgłoszenie…"
                    onChange={(event) =>
                      setNewTaskTitles((current) => ({ ...current, [column.id]: event.target.value }))
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
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={(patch) => handleSaveTask(activeTask.id, patch)}
          onCloseTask={() => handleCloseTask(activeTask.id)}
          onComment={async () => {
            await postKanban(token, {
              action: "addComment",
              taskId: activeTask.id,
              body: commentDraft,
              authorName,
            });
            setCommentDraft("");
            await onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}
