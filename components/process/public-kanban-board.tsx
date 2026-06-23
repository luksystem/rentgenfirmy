"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Plus, Sparkles } from "lucide-react";
import { KanbanBoardControls } from "@/components/process/kanban-board-controls";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import type { KanbanAttachmentUploadOptions } from "@/components/process/kanban-attachment-gallery";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import { KANBAN_DRAG_HINT, KANBAN_MOBILE_MOVE_HINT, countOpenKanbanTasks, sortKanbanColumnTasks } from "@/lib/process/kanban-ui";
import {
  buildKanbanTaskActivityMap,
  collectKanbanAssigneeOptions,
  matchesKanbanBoardFilters,
  type KanbanBoardFilters,
  type KanbanColumnSortMode,
} from "@/lib/process/kanban-task-meta";
import type { KanbanBoard, KanbanTask } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";

async function postKanban(token: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/kanban/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Operacja nie powiodła się.");
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export function PublicKanbanBoard({
  token,
  board,
  authorName,
  assigneeOptions = [],
  showProjectLabel = false,
  onRefresh,
}: {
  token: string;
  board: KanbanBoard;
  authorName: string;
  assigneeOptions?: string[];
  showProjectLabel?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [addingTaskColumnId, setAddingTaskColumnId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; columnId: string } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isCoarsePointer, setIsCoarsePointer] = useState(true);
  const [activeColumnId, setActiveColumnId] = useState(board.columns[0]?.id ?? "");
  const [filters, setFilters] = useState<KanbanBoardFilters>({ priority: "all", assignee: "all" });
  const [sortMode, setSortMode] = useState<KanbanColumnSortMode>("position");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!board.columns.some((column) => column.id === activeColumnId)) {
      setActiveColumnId(board.columns[0]?.id ?? "");
    }
  }, [board.columns, activeColumnId]);

  const scrollToColumn = useCallback((columnId: string) => {
    setActiveColumnId(columnId);
    columnRefs.current[columnId]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isCoarsePointer) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const columnId = visible?.target.getAttribute("data-column-id");
        if (columnId) {
          setActiveColumnId(columnId);
        }
      },
      { root: scroller, threshold: [0.55, 0.75] },
    );

    board.columns.forEach((column) => {
      const node = columnRefs.current[column.id];
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [board.columns, isCoarsePointer]);

  const activeTask = board.tasks.find((task) => task.id === activeTaskId) ?? null;
  const dragTask = dragTaskId ? (board.tasks.find((task) => task.id === dragTaskId) ?? null) : null;
  const activeComments = board.comments.filter((comment) => comment.taskId === activeTaskId);
  const activeReactions = board.reactions;
  const activeEvents = board.events.filter((event) => event.taskId === activeTaskId);
  const activeAttachments = board.attachments.filter((entry) => entry.taskId === activeTaskId);
  const columnOptions = board.columns.map((column) => ({ id: column.id, title: column.title }));
  const activityMap = useMemo(() => buildKanbanTaskActivityMap(board), [board]);
  const filterAssigneeOptions = useMemo(
    () => collectKanbanAssigneeOptions(board.tasks, assigneeOptions),
    [assigneeOptions, board.tasks],
  );

  const stableRefresh = useCallback(() => onRefresh(), [onRefresh]);
  useKanbanRealtime(board.id, stableRefresh);

  async function handleAddTask(columnId: string) {
    if (addingTaskColumnId) {
      return;
    }
    const title = newTaskTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    setAddingTaskColumnId(columnId);
    try {
      await postKanban(token, { action: "createTask", columnId, title, authorName });
      setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
      await onRefresh();
    } finally {
      setAddingTaskColumnId(null);
    }
  }

  async function handleDrop(columnId: string) {
    if (!dragTaskId) {
      return;
    }
    await handleMoveTask(dragTaskId, columnId);
    clearDragState();
  }

  function clearDragState() {
    setDragTaskId(null);
    setDragOverColumnId(null);
  }

  async function handleMoveTask(taskId: string, columnId: string) {
    setPendingMove({ taskId, columnId });
    try {
      const columnTasks = board.tasks.filter(
        (task) => task.columnId === columnId && task.id !== taskId,
      );
      await postKanban(token, {
        action: "moveTask",
        taskId,
        columnId,
        position: columnTasks.length,
        authorName,
      });
      await onRefresh();
    } finally {
      setPendingMove(null);
    }
  }

  function getColumnTasks(columnId: string) {
    const tasks = board.tasks.filter((task) => {
      if (pendingMove?.taskId === task.id) {
        return pendingMove.columnId === columnId;
      }
      return task.columnId === columnId;
    });
    return tasks.filter((task) => matchesKanbanBoardFilters(task, filters));
  }

  async function handleSaveTask(
    taskId: string,
    patch: Partial<Pick<KanbanTask, "title" | "description" | "priority" | "dueDate" | "assigneeName">>,
  ) {
    await postKanban(token, {
      action: "updateTask",
      taskId,
      authorName,
      ...patch,
    });
    await onRefresh();
  }

  async function handleCloseTask(taskId: string, closed: boolean) {
    await postKanban(token, {
      action: closed ? "closeTask" : "reopenTask",
      taskId,
      authorName,
    });
    await onRefresh();
  }

  async function handleUploadAttachment(
    taskId: string,
    file: File,
    options?: KanbanAttachmentUploadOptions,
  ) {
    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("authorName", authorName);
    formData.append("file", file);
    if (options?.setAsCardCover) {
      formData.append("setAsCardCover", "true");
    }

    const response = await fetch(`/api/kanban/${encodeURIComponent(token)}/attachments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się przesłać pliku.");
    }
    await onRefresh();
  }

  async function handleSetAttachmentCover(taskId: string, attachmentId: string, isCardCover: boolean) {
    const response = await fetch(`/api/kanban/${encodeURIComponent(token)}/attachments/cover`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        authorName,
        ...(attachmentId ? { attachmentId } : {}),
        isCardCover,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Nie udało się zmienić okładki.");
    }
    await onRefresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
      <div className="shrink-0 rounded-xl border border-accent/20 bg-accent/10 px-3.5 py-2.5 md:hidden">
        <p className="flex items-start gap-2 text-sm leading-snug text-foreground/90">
          <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {KANBAN_MOBILE_MOVE_HINT}
        </p>
      </div>
      <p className="hidden shrink-0 text-sm text-muted md:block">
        {KANBAN_DRAG_HINT} Możesz też otworzyć zgłoszenie i zmienić etap z listy.
      </p>

      <KanbanBoardControls
        filters={filters}
        sortMode={sortMode}
        assigneeOptions={filterAssigneeOptions}
        onFiltersChange={setFilters}
        onSortModeChange={setSortMode}
      />

      <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 md:hidden">
        {board.columns.map((column) => {
          const count = countOpenKanbanTasks(
            board.tasks.filter((task) => task.columnId === column.id),
          );
          const isActive = column.id === activeColumnId;

          return (
            <button
              key={column.id}
              type="button"
              onClick={() => scrollToColumn(column.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition",
                isActive
                  ? "border-accent/50 bg-accent text-accent-foreground shadow-sm"
                  : "border-border/70 bg-surface/60 text-muted hover:border-accent/30 hover:text-foreground",
              )}
            >
              {column.title}
              <span className={cn("ml-1.5 tabular-nums", isActive ? "opacity-90" : "opacity-70")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:snap-none md:flex-row md:overflow-hidden md:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        {board.columns.map((column, index) => {
          const columnTasks = getColumnTasks(column.id);
          const tasks = sortKanbanColumnTasks(columnTasks, sortMode);
          const openCount = countOpenKanbanTasks(columnTasks);
          const isDropTarget = Boolean(dragTaskId && dragOverColumnId === column.id);

          return (
            <div
              key={column.id}
              ref={(node) => {
                columnRefs.current[column.id] = node;
              }}
              data-column-id={column.id}
              className={cn(
                "flex w-[min(100%,22rem)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface-muted/40 shadow-sm md:min-h-0 md:w-auto md:min-w-0 md:flex-1 md:snap-align-none",
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
              <div className="shrink-0 border-b border-border/60 bg-surface/40 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{column.title}</p>
                    <p className="text-xs text-muted">{openCount} aktywnych</p>
                  </div>
                  <span className="hidden rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted md:inline">
                    Etap {index + 1}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "flex min-h-[min(52vh,28rem)] flex-1 flex-col gap-2.5 overflow-y-auto p-3 md:min-h-0",
                  isDropTarget && "bg-accent/[0.03]",
                )}
              >
                {tasks.length ? (
                  tasks.map((task) => (
                    <KanbanTaskCardView
                      key={task.id}
                      task={task}
                      attachments={board.attachments.filter((entry) => entry.taskId === task.id)}
                      reactions={board.reactions}
                      activity={activityMap.get(task.id)}
                      draggable={!isCoarsePointer}
                      showDueDate
                      showAssignee
                      showProjectLabel={showProjectLabel}
                      projectName={board.projectName}
                      showChevron={isCoarsePointer}
                      isDragging={dragTaskId === task.id}
                      onOpen={() => setActiveTaskId(task.id)}
                      onDragStart={() => setDragTaskId(task.id)}
                      onDragEnd={clearDragState}
                    />
                  ))
                ) : (
                  <div
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-200",
                      isDropTarget
                        ? "border-accent/50 bg-accent/10"
                        : "border-border/60 bg-surface/30",
                    )}
                  >
                    {isDropTarget && dragTask ? (
                      <KanbanDropPlaceholder title={dragTask.title} className="w-full" />
                    ) : (
                      <>
                        <Sparkles className="mb-2 h-5 w-5 text-muted" />
                        <p className="text-sm text-muted">Brak zgłoszeń w tym etapie</p>
                      </>
                    )}
                  </div>
                )}

                {isDropTarget && tasks.length > 0 && dragTask ? (
                  <KanbanDropPlaceholder title={dragTask.title} />
                ) : null}

                <div className="mt-auto grid gap-2 rounded-2xl border border-dashed border-accent/25 bg-accent/5 p-3">
                  <Input
                    value={newTaskTitles[column.id] ?? ""}
                    placeholder="Opisz problem lub pomysł…"
                    className="h-11 border-border/60 bg-surface/80"
                    disabled={addingTaskColumnId !== null}
                    onChange={(event) =>
                      setNewTaskTitles((current) => ({ ...current, [column.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && addingTaskColumnId === null) {
                        void handleAddTask(column.id);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 w-full"
                    disabled={addingTaskColumnId !== null || !newTaskTitles[column.id]?.trim()}
                    onClick={() => void handleAddTask(column.id)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {addingTaskColumnId === column.id ? "Dodawanie…" : "Dodaj zgłoszenie"}
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
          reactions={activeReactions}
          events={activeEvents}
          attachments={activeAttachments}
          authorName={authorName}
          authorSide="client"
          allowAttachmentUpload
          columns={columnOptions}
          currentColumnId={activeTask.columnId}
          assigneeOptions={filterAssigneeOptions}
          mentionOptions={filterAssigneeOptions}
          onMoveToColumn={(columnId) => handleMoveTask(activeTask.id, columnId)}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={(patch) => handleSaveTask(activeTask.id, patch)}
          onCloseTask={(closed) => handleCloseTask(activeTask.id, closed)}
          onUploadAttachment={(file, options) => handleUploadAttachment(activeTask.id, file, options)}
          onSetAttachmentCover={(attachmentId, isCardCover) =>
            handleSetAttachmentCover(activeTask.id, attachmentId, isCardCover)
          }
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
          onUpdateComment={async (commentId, body) => {
            await postKanban(token, {
              action: "updateComment",
              commentId,
              body,
              authorName,
            });
            await onRefresh();
          }}
          onDeleteComment={async (commentId) => {
            await postKanban(token, {
              action: "deleteComment",
              commentId,
              authorName,
            });
            await onRefresh();
          }}
          onToggleReaction={async (emoji) => {
            await postKanban(token, {
              action: "toggleReaction",
              taskId: activeTask.id,
              emoji,
              authorName,
            });
            await onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}
