"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { KanbanBoardControls } from "@/components/process/kanban-board-controls";
import { KanbanBoardStatsBar } from "@/components/process/kanban-board-stats-bar";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useKanbanMobileColumns } from "@/hooks/use-kanban-mobile-columns";
import { useKanbanRealtime } from "@/hooks/use-kanban-realtime";
import {
  KANBAN_BOARD_HEADER_CLASS,
  KANBAN_BOARD_ROOT_CLASS,
  KANBAN_DRAG_HINT,
  KANBAN_MOBILE_COLUMN_BODY_CLASS,
  KANBAN_MOBILE_COLUMN_SHELL_CLASS,
  KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS,
  countOpenKanbanTasks,
  sortKanbanColumnTasks,
} from "@/lib/process/kanban-ui";
import {
  buildKanbanTaskActivityMap,
  collectKanbanAssigneeOptions,
  computeKanbanBoardStats,
  matchesKanbanBoardFilters,
  type KanbanBoardFilters,
  type KanbanColumnSortMode,
} from "@/lib/process/kanban-task-meta";
import {
  canMoveTaskToMergedColumn,
  getKanbanTaskProjectKey,
  listKanbanProjectsFromBoards,
  mergeKanbanBoards,
  resolveSourceColumnIdForMergedColumn,
  resolveTargetColumnId,
  type MergedKanbanView,
} from "@/lib/process/kanban-merge";
import type { KanbanAuthorSide } from "@/lib/process/kanban-types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { buildKanbanMentionCandidates, buildKanbanMentionOptionNames } from "@/lib/kanban/mention-candidates";
import {
  addKanbanComment,
  closeKanbanTask,
  createKanbanTask,
  deleteKanbanComment,
  deleteKanbanTask,
  markKanbanBoardRead,
  moveKanbanTask,
  toggleKanbanTaskReaction,
  updateKanbanComment,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";
import { useProcessStore } from "@/store/process-store";

export function AggregatedKanbanBoard({
  authorSide,
  authorName,
}: {
  authorSide: KanbanAuthorSide;
  authorName: string;
}) {
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);

  useEffect(() => {
    if (authorSide === "team") {
      void loadTeamProfiles();
    }
  }, [authorSide, loadTeamProfiles]);
  const cachedMergedView = useKanbanCacheStore((state) => state.mergedView);
  const ensureAllBoards = useKanbanCacheStore((state) => state.ensureAllBoards);
  const setCachedBoard = useKanbanCacheStore((state) => state.setBoard);
  const [mergedView, setMergedView] = useState<MergedKanbanView | null>(cachedMergedView);
  const [loading, setLoading] = useState(!cachedMergedView);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; columnId: string } | null>(null);
  const [filters, setFilters] = useState<KanbanBoardFilters>({
    priority: "all",
    assignee: "all",
    projectId: "all",
  });
  const [sortMode, setSortMode] = useState<KanbanColumnSortMode>("position");
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [newTaskProjectKeys, setNewTaskProjectKeys] = useState<Record<string, string>>({});
  const [addingTaskColumnId, setAddingTaskColumnId] = useState<string | null>(null);

  const board = mergedView?.displayBoard ?? null;

  const refresh = useCallback(
    async (options?: { force?: boolean; showLoading?: boolean }) => {
      const force = options?.force ?? true;
      const showLoading = options?.showLoading ?? !useKanbanCacheStore.getState().mergedView;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const boards = await ensureAllBoards({ force });
        const merged = useKanbanCacheStore.getState().mergedView ?? mergeKanbanBoards(boards);
        setMergedView(merged);

        if (authorSide === "team") {
          await Promise.all(boards.map((entry) => markKanbanBoardRead(entry.id)));
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [authorSide, ensureAllBoards],
  );

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await refresh({ force: false, showLoading: !cachedMergedView });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy wdrożeń.");
      }
    })();
  }, [cachedMergedView, refresh]);

  useEffect(() => {
    if (cachedMergedView) {
      setMergedView(cachedMergedView);
    }
  }, [cachedMergedView]);

  useKanbanRealtime("aggregated", async () => {
    await refresh({ force: true, showLoading: false });
  });

  const activeTask = board?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const dragTask = dragTaskId ? (board?.tasks.find((task) => task.id === dragTaskId) ?? null) : null;
  const activeComments = board?.comments.filter((comment) => comment.taskId === activeTaskId) ?? [];
  const activeReactions = board?.reactions ?? [];
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
  const mentionCandidates = useMemo(
    () => buildKanbanMentionCandidates(teamProfiles, assigneeOptions),
    [assigneeOptions, teamProfiles],
  );
  const mentionOptions = useMemo(
    () => buildKanbanMentionOptionNames(mentionCandidates),
    [mentionCandidates],
  );
  const boardStats = useMemo(
    () => (board ? computeKanbanBoardStats(board) : null),
    [board],
  );
  const projectOptions = useMemo(() => {
    if (!mergedView) {
      return [];
    }
    return listKanbanProjectsFromBoards(mergedView.boards).map((project) => ({
      id: project.key,
      name: project.name,
    }));
  }, [mergedView]);
  const kanbanProjects = useMemo(
    () => (mergedView ? listKanbanProjectsFromBoards(mergedView.boards) : []),
    [mergedView],
  );
  const { activeColumnId, isCoarsePointer, scrollerRef, scrollToColumn, setColumnRef } =
    useKanbanMobileColumns(board?.columns ?? []);

  function defaultProjectKeyForColumn(columnId: string) {
    if (filters.projectId && filters.projectId !== "all") {
      return filters.projectId;
    }
    return newTaskProjectKeys[columnId] ?? kanbanProjects[0]?.key ?? "";
  }

  async function handleAddTask(mergedColumnId: string) {
    if (!mergedView || addingTaskColumnId) {
      return;
    }
    const title = newTaskTitles[mergedColumnId]?.trim();
    const projectKey = defaultProjectKeyForColumn(mergedColumnId);
    const project = kanbanProjects.find((entry) => entry.key === projectKey);
    const mergedColumn = board?.columns.find((column) => column.id === mergedColumnId);
    if (!title || !project || !mergedColumn) {
      return;
    }

    const sourceColumnId = resolveSourceColumnIdForMergedColumn(project.board, mergedColumn.title);
    if (!sourceColumnId) {
      return;
    }

    setAddingTaskColumnId(mergedColumnId);
    try {
      await createKanbanTask({
        columnId: sourceColumnId,
        title,
        authorSide,
        authorName,
      });
      setNewTaskTitles((current) => ({ ...current, [mergedColumnId]: "" }));
      await refresh();
    } finally {
      setAddingTaskColumnId(null);
    }
  }

  function matchesProjectFilter(taskId: string) {
    if (!filters.projectId || filters.projectId === "all" || !mergedView) {
      return true;
    }
    const source = mergedView.taskSources.get(taskId);
    if (!source) {
      return false;
    }
    return getKanbanTaskProjectKey(source) === filters.projectId;
  }

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
      if (!matchesProjectFilter(task.id)) {
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

  if (loading && !mergedView) {
    return <p className="text-sm text-muted">Ładowanie tablicy wdrożeń…</p>;
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
    <div className={KANBAN_BOARD_ROOT_CLASS}>
      <div className={KANBAN_BOARD_HEADER_CLASS}>
      <p className="hidden shrink-0 text-sm text-muted md:block">
        {KANBAN_DRAG_HINT} Kolumny łączone po nazwie — na karcie widać projekt źródłowy. Przenosisz zadanie tylko do
        kolumny o tej samej nazwie w tablicy projektu źródłowego. Nowe zgłoszenia dodajesz poniżej w kolumnie — wybierz
        projekt z listy tablic wdrożeniowych.
      </p>

      {boardStats ? <KanbanBoardStatsBar stats={boardStats} /> : null}

      <KanbanBoardControls
        filters={filters}
        sortMode={sortMode}
        assigneeOptions={assigneeOptions}
        projectOptions={projectOptions}
        onFiltersChange={setFilters}
        onSortModeChange={setSortMode}
      />

      <KanbanMobileColumnNav
        columns={board.columns}
        activeColumnId={activeColumnId}
        onSelect={scrollToColumn}
        openCountForColumn={(columnId) =>
          countOpenKanbanTasks(board.tasks.filter((task) => task.columnId === columnId))
        }
      />
      </div>

      <div ref={scrollerRef} className={KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS}>
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
              ref={(node) => setColumnRef(column.id, node)}
              data-column-id={column.id}
              className={cn(
                KANBAN_MOBILE_COLUMN_SHELL_CLASS,
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
                  KANBAN_MOBILE_COLUMN_BODY_CLASS,
                  isDropTarget && "bg-accent/[0.03]",
                )}
              >
                {tasks.map((task) => (
                  <KanbanTaskCardView
                    key={task.id}
                    task={task}
                    attachments={board.attachments.filter((entry) => entry.taskId === task.id)}
                    reactions={board.reactions}
                    activity={activityMap.get(task.id)}
                    isNew={task.isNewForTeam && authorSide === "team"}
                    showAssignee
                    showProjectLabel
                    projectName={mergedView.taskSources.get(task.id)?.projectName}
                    draggable={!isCoarsePointer}
                    showChevron={isCoarsePointer}
                    isDragging={dragTaskId === task.id}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => setDragTaskId(task.id)}
                    onDragEnd={clearDragState}
                  />
                ))}

                {isDropTarget && dragTask ? <KanbanDropPlaceholder title={dragTask.title} /> : null}

                {authorSide === "team" && kanbanProjects.length ? (
                  <div className="mt-auto grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
                    <Field label="Projekt" className="text-xs">
                      <Select
                        value={defaultProjectKeyForColumn(column.id)}
                        disabled={addingTaskColumnId !== null}
                        onChange={(event) =>
                          setNewTaskProjectKeys((current) => ({
                            ...current,
                            [column.id]: event.target.value,
                          }))
                        }
                      >
                        {kanbanProjects.map((project) => (
                          <option key={project.key} value={project.key}>
                            {project.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Input
                      value={newTaskTitles[column.id] ?? ""}
                      placeholder="Nowe zgłoszenie…"
                      disabled={addingTaskColumnId !== null}
                      onChange={(event) =>
                        setNewTaskTitles((current) => ({
                          ...current,
                          [column.id]: event.target.value,
                        }))
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
                      variant="secondary"
                      disabled={
                        addingTaskColumnId !== null ||
                        !newTaskTitles[column.id]?.trim() ||
                        !defaultProjectKeyForColumn(column.id)
                      }
                      onClick={() => void handleAddTask(column.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {addingTaskColumnId === column.id ? "Dodawanie…" : "Dodaj"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {activeTask && mergedView ? (
        <KanbanTaskDetailModal
          task={activeTask}
          comments={activeComments}
          reactions={activeReactions}
          events={activeEvents}
          attachments={activeAttachments}
          authorName={authorName}
          authorSide={authorSide}
          assigneeOptions={assigneeOptions}
          mentionOptions={mentionOptions}
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
            const updated = await updateKanbanTask(activeTask.id, patch);
            const sourceBoard = Object.values(useKanbanCacheStore.getState().boardsByItemId).find((entry) =>
              entry.tasks.some((task) => task.id === updated.id),
            );
            if (sourceBoard) {
              const nextBoard = {
                ...sourceBoard,
                tasks: sourceBoard.tasks.map((entry) => (entry.id === updated.id ? updated : entry)),
              };
              setCachedBoard(nextBoard);
              setMergedView(useKanbanCacheStore.getState().mergedView);
            } else {
              await refresh();
            }
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
              taskTitle: activeTask.title,
              linkUrl: "/tablice-wdrozen/zbiorcza",
              mentionCandidates,
            });
            setCommentDraft("");
            await refresh();
          }}
          onUpdateComment={async (commentId, body) => {
            await updateKanbanComment(commentId, { body, authorName, authorSide });
            await refresh();
          }}
          onDeleteComment={async (commentId) => {
            await deleteKanbanComment(commentId, { authorName, authorSide });
            await refresh();
          }}
          onToggleReaction={async (emoji) => {
            await toggleKanbanTaskReaction({
              taskId: activeTask.id,
              emoji,
              authorName,
              authorSide,
            });
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
