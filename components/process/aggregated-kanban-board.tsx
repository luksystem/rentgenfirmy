"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KanbanBoardControls } from "@/components/process/kanban-board-controls";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import { KANBAN_DRAG_HINT, countOpenKanbanTasks, sortKanbanColumnTasks } from "@/lib/process/kanban-ui";
import {
  buildKanbanTaskActivityMap,
  collectKanbanAssigneeOptions,
  matchesKanbanBoardFilters,
  type KanbanBoardFilters,
  type KanbanColumnSortMode,
} from "@/lib/process/kanban-task-meta";
import {
  canMoveTaskToMergedColumn,
  mergeKanbanBoards,
  resolveTargetColumnId,
  type MergedKanbanView,
} from "@/lib/process/kanban-merge";
import type { KanbanAuthorSide } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  addKanbanComment,
  closeKanbanTask,
  deleteKanbanTask,
  markKanbanBoardRead,
  moveKanbanTask,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";
import { fetchAllKanbanBoardGraphs } from "@/lib/supabase/kanban-hub-repository";

export function AggregatedKanbanBoard({
  authorSide,
  authorName,
}: {
  authorSide: KanbanAuthorSide;
  authorName: string;
}) {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const [mergedView, setMergedView] = useState<MergedKanbanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; columnId: string } | null>(null);
  const [filters, setFilters] = useState<KanbanBoardFilters>({ priority: "all", assignee: "all" });
  const [sortMode, setSortMode] = useState<KanbanColumnSortMode>("position");

  const board = mergedView?.displayBoard ?? null;

  const refresh = useCallback(async () => {
    const boards = await fetchAllKanbanBoardGraphs();
    const merged = mergeKanbanBoards(boards);
    setMergedView(merged);

    if (authorSide === "team") {
      await Promise.all(boards.map((entry) => markKanbanBoardRead(entry.id)));
    }
  }, [authorSide]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy zbiorczej.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useKanbanRealtime("aggregated", refresh);

  const activeTask = board?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const dragTask = dragTaskId ? (board?.tasks.find((task) => task.id === dragTaskId) ?? null) : null;
  const activeComments = board?.comments.filter((comment) => comment.taskId === activeTaskId) ?? [];
  const activeEvents = board?.events.filter((event) => event.taskId === activeTaskId) ?? [];
  const activeAttachments = board?.attachments.filter((entry) => entry.taskId === activeTaskId) ?? [];
  const activityMap = useMemo(
    () => (board ? buildKanbanTaskActivityMap(board) : new Map()),
    [board],
  );
  const assigneeOptions = useMemo(
    () => (board ? collectKanbanAssigneeOptions(board.tasks, fieldOptions.nextStepOwners) : []),
    [board, fieldOptions.nextStepOwners],
  );

  function getColumnTasks(columnId: string) {
    if (!board) {
      return [];
    }

    return board.tasks.filter((task) => {
      if (pendingMove?.taskId === task.id) {
        return pendingMove.columnId === columnId;
      }
      if (task.columnId !== columnId) {
        return false;
      }
      return matchesKanbanBoardFilters(task, filters);
    });
  }

  function isDropTargetAllowed(columnId: string) {
    if (!dragTaskId || !mergedView) {
      return false;
    }
    return canMoveTaskToMergedColumn(dragTaskId, columnId, mergedView);
  }

  async function handleDrop(columnId: string) {
    if (!dragTaskId || !mergedView || !board) {
      return;
    }

    const taskId = dragTaskId;
    const targetColumnId = resolveTargetColumnId(taskId, columnId, mergedView);
    if (!targetColumnId) {
      clearDragState();
      return;
    }

    setPendingMove({ taskId, columnId });
    clearDragState();

    try {
      const columnTasks = board.tasks.filter(
        (task) => task.columnId === columnId && task.id !== taskId,
      );
      await moveKanbanTask(taskId, targetColumnId, columnTasks.length);
      await refresh();
    } finally {
      setPendingMove(null);
    }
  }

  function clearDragState() {
    setDragTaskId(null);
    setDragOverColumnId(null);
  }

  if (loading) {
    return <p className="text-sm text-muted">Ładowanie tablicy zbiorczej…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  if (!board || !mergedView) {
    return (
      <p className="text-sm text-muted">
        Brak tablic Kanban w projektach. Uruchom proces z elementem Kanban na co najmniej jednym projekcie.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-sm text-muted">
        {KANBAN_DRAG_HINT} Kolumny łączone po nazwie — na karcie widać projekt źródłowy. Nowe zgłoszenia dodawaj w
        tablicy konkretnego projektu.
      </p>

      <KanbanBoardControls
        filters={filters}
        sortMode={sortMode}
        assigneeOptions={assigneeOptions}
        onFiltersChange={setFilters}
        onSortModeChange={setSortMode}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1 md:flex-row md:overflow-hidden">
        {board.columns.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          const tasks = sortKanbanColumnTasks(columnTasks, sortMode);
          const openCount = countOpenKanbanTasks(columnTasks);
          const isDropTarget = Boolean(
            dragTaskId && dragOverColumnId === column.id && isDropTargetAllowed(column.id),
          );

          return (
            <div
              key={column.id}
              className={cn(
                "flex min-h-[280px] min-w-0 flex-1 flex-col rounded-2xl border border-border/80 bg-surface-muted/30 md:min-h-0",
                getKanbanColumnDropTargetClasses(isDropTarget),
              )}
              onDragEnter={(event) => {
                if (!dragTaskId || !isDropTargetAllowed(column.id)) {
                  return;
                }
                event.preventDefault();
                setDragOverColumnId(column.id);
              }}
              onDragOver={(event) => {
                if (!dragTaskId || !isDropTargetAllowed(column.id)) {
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
                    activity={activityMap.get(task.id)}
                    isNew={task.isNewForTeam && authorSide === "team"}
                    showAssignee
                    showProjectLabel
                    projectName={mergedView.taskSources.get(task.id)?.projectName}
                    isDragging={dragTaskId === task.id}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={clearDragState}
                  />
                ))}

                {isDropTarget && dragTask ? <KanbanDropPlaceholder title={dragTask.title} /> : null}
              </div>
            </div>
          );
        })}
      </div>

      {activeTask && mergedView ? (
        <KanbanTaskDetailModal
          task={activeTask}
          comments={activeComments}
          events={activeEvents}
          attachments={activeAttachments}
          authorName={authorName}
          assigneeOptions={assigneeOptions}
          canDelete={authorSide === "team"}
          columns={board.columns.map((column) => ({ id: column.id, title: column.title }))}
          currentColumnId={activeTask.columnId}
          onMoveToColumn={async (columnId) => {
            const targetColumnId = resolveTargetColumnId(activeTask.id, columnId, mergedView);
            if (!targetColumnId) {
              return;
            }
            const columnTasks = board.tasks.filter(
              (task) => task.columnId === columnId && task.id !== activeTask.id,
            );
            await moveKanbanTask(activeTask.id, targetColumnId, columnTasks.length);
            await refresh();
          }}
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
