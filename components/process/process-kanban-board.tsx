"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { KanbanAiImportPanel } from "@/components/process/kanban-ai-import-panel";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { KanbanBoardControls } from "@/components/process/kanban-board-controls";
import { KanbanBoardStatsBar } from "@/components/process/kanban-board-stats-bar";
import { KanbanTaskCardView } from "@/components/process/kanban-task-card";
import { KanbanDropPlaceholder, getKanbanColumnDropTargetClasses } from "@/components/process/kanban-drop-placeholder";
import { KanbanTaskDetailModal } from "@/components/process/kanban-task-detail";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
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
  getKanbanPublicUrl,
  type KanbanAuthorSide,
  type KanbanBoard,
  type KanbanTemplatePayload,
} from "@/lib/process/kanban-types";
import { isKanbanTemplatePayload } from "@/lib/process/kanban-payload";
import { buildKanbanMentionCandidates, buildKanbanMentionOptionNames } from "@/lib/kanban/mention-candidates";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useKanbanCacheStore } from "@/store/kanban-cache-store";
import { useProcessStore } from "@/store/process-store";
import {
  addKanbanComment,
  closeKanbanTask,
  createKanbanTask,
  deleteKanbanComment,
  deleteKanbanTask,
  ensureKanbanBoard,
  markKanbanBoardRead,
  moveKanbanTask,
  setKanbanPublicEnabled,
  toggleKanbanTaskReaction,
  updateKanbanComment,
  updateKanbanTask,
} from "@/lib/supabase/kanban-repository";

export function ProcessKanbanBoard({
  projectProcessItemId,
  templatePayload,
  authorSide,
  authorName,
  showPublicLink = false,
  embedded = false,
}: {
  projectProcessItemId: string;
  templatePayload: KanbanTemplatePayload | unknown;
  authorSide: KanbanAuthorSide;
  authorName: string;
  showPublicLink?: boolean;
  embedded?: boolean;
}) {
  const cachedBoard = useKanbanCacheStore((state) => state.boardsByItemId[projectProcessItemId]);
  const ensureBoard = useKanbanCacheStore((state) => state.ensureBoard);
  const setCachedBoard = useKanbanCacheStore((state) => state.setBoard);

  const [board, setBoard] = useState<KanbanBoard | null>(cachedBoard ?? null);
  const [loading, setLoading] = useState(!cachedBoard);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [newTaskDueDates, setNewTaskDueDates] = useState<Record<string, string>>({});
  const [addingTaskColumnId, setAddingTaskColumnId] = useState<string | null>(null);
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
  const [publicLinkOpen, setPublicLinkOpen] = useState(!embedded);
  const [filters, setFilters] = useState<KanbanBoardFilters>({ priority: "all", assignee: "all" });
  const [sortMode, setSortMode] = useState<KanbanColumnSortMode>("position");
  const dragTaskIdRef = useRef<string | null>(null);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const teamProfiles = useProcessStore((state) => state.teamProfiles);
  const loadTeamProfiles = useProcessStore((state) => state.loadTeamProfiles);
  const pathname = usePathname();

  useEffect(() => {
    if (authorSide === "team") {
      void loadTeamProfiles();
    }
  }, [authorSide, loadTeamProfiles]);

  const refresh = useCallback(
    async (options?: { force?: boolean; showLoading?: boolean }) => {
      const force = options?.force ?? true;
      const showLoading = options?.showLoading ?? !useKanbanCacheStore.getState().boardsByItemId[projectProcessItemId];
      const template = isKanbanTemplatePayload(templatePayload)
        ? templatePayload
        : { columns: [] };

      if (showLoading) {
        setLoading(true);
      }

      try {
        const loaded =
          (await ensureBoard(projectProcessItemId, { force })) ??
          (await ensureKanbanBoard(projectProcessItemId, template));
        setBoard(loaded);
        setCachedBoard(loaded);

        if (authorSide === "team" && loaded) {
          await markKanbanBoardRead(loaded.id);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [authorSide, ensureBoard, projectProcessItemId, setCachedBoard, templatePayload],
  );

  useEffect(() => {
    void (async () => {
      setError(null);
      try {
        await refresh({ force: false, showLoading: !cachedBoard });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania tablicy.");
      }
    })();
  }, [cachedBoard, refresh]);

  useEffect(() => {
    if (cachedBoard) {
      setBoard(cachedBoard);
    }
  }, [cachedBoard]);

  useKanbanRealtime(board?.id ?? null, async () => {
    await refresh({ force: true, showLoading: false });
  });

  useEffect(() => {
    if (!board) {
      return;
    }
    setAccessUsername(board.publicAccessUsername ?? "");
    setAccessAuthorName(board.publicAuthorName === "Klient" ? "" : board.publicAuthorName);
  }, [board]);

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
  const firstColumn = useMemo(
    () => [...(board?.columns ?? [])].sort((left, right) => left.position - right.position)[0] ?? null,
    [board?.columns],
  );
  const { activeColumnId, scrollerRef, scrollToColumn, setColumnRef } =
    useKanbanMobileColumns(board?.columns ?? []);

  async function handleAddTask(columnId: string) {
    if (addingTaskColumnId) {
      return;
    }
    const title = newTaskTitles[columnId]?.trim();
    if (!title) {
      return;
    }
    const dueDateRaw = newTaskDueDates[columnId]?.trim();
    const dueDate =
      dueDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw) ? dueDateRaw : null;
    setAddingTaskColumnId(columnId);
    setError(null);
    try {
      await createKanbanTask({ columnId, title, dueDate, authorSide, authorName });
      setNewTaskTitles((current) => ({ ...current, [columnId]: "" }));
      setNewTaskDueDates((current) => ({ ...current, [columnId]: "" }));
      await refresh();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Nie udało się dodać taska.");
    } finally {
      setAddingTaskColumnId(null);
    }
  }

  async function handleDrop(columnId: string, taskIdOverride?: string) {
    const taskId = taskIdOverride ?? dragTaskIdRef.current ?? dragTaskId;
    if (!taskId || !board) {
      return;
    }
    setPendingMove({ taskId, columnId });
    clearDragState();
    try {
      const columnTasks = board.tasks.filter(
        (task) => task.columnId === columnId && task.id !== taskId,
      );
      await moveKanbanTask(taskId, columnId, columnTasks.length);
      await refresh();
    } finally {
      setPendingMove(null);
    }
  }

  function beginDrag(taskId: string) {
    dragTaskIdRef.current = taskId;
    setDragTaskId(taskId);
  }

  function clearDragState() {
    dragTaskIdRef.current = null;
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
      if (task.columnId !== columnId) {
        return false;
      }
      return matchesKanbanBoardFilters(task, filters);
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

  if (loading && !board) {
    return <p className="text-sm text-muted">Ładowanie tablicy Kanban…</p>;
  }

  if (error || !board) {
    return <p className="text-sm text-rose-400">{error ?? "Nie udało się załadować tablicy."}</p>;
  }

  return (
    <div className={KANBAN_BOARD_ROOT_CLASS}>
      <div className={KANBAN_BOARD_HEADER_CLASS}>
      {showPublicLink ? (
        <div className="grid shrink-0 gap-2 rounded-xl border border-border/70 bg-surface-muted/30 p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
            onClick={() => setPublicLinkOpen((value) => !value)}
          >
            Link publiczny i dostęp klienta
            <span className="text-xs text-muted">{publicLinkOpen ? "Zwiń" : "Rozwiń"}</span>
          </button>
          {publicLinkOpen ? (
          <div className="grid gap-3">
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
        </div>
      ) : null}

      {boardStats ? <KanbanBoardStatsBar stats={boardStats} /> : null}

      {authorSide === "team" && firstColumn ? (
        <KanbanAiImportPanel
          firstColumnId={firstColumn.id}
          firstColumnTitle={firstColumn.title}
          authorSide={authorSide}
          authorName={authorName}
          onCreated={() => refresh({ force: true, showLoading: false })}
        />
      ) : null}

      <p className="hidden shrink-0 text-sm text-muted md:block">{KANBAN_DRAG_HINT}</p>

      <KanbanBoardControls
        filters={filters}
        sortMode={sortMode}
        assigneeOptions={assigneeOptions}
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
          const isDropTarget = Boolean(dragTaskId && dragOverColumnId === column.id);

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
                    isDragging={dragTaskId === task.id}
                    onOpen={() => setActiveTaskId(task.id)}
                    onDragStart={() => beginDrag(task.id)}
                    onDragEnd={clearDragState}
                    onDragHover={(columnId) => setDragOverColumnId(columnId)}
                    onDragDrop={(columnId) => void handleDrop(columnId, task.id)}
                  />
                ))}

                {isDropTarget && dragTask ? <KanbanDropPlaceholder title={dragTask.title} /> : null}

                <div className="mt-auto grid gap-2 rounded-xl border border-dashed border-border/70 p-2">
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
                  <Field label="Termin (opcjonalnie)" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        className="min-w-0 flex-1"
                        value={newTaskDueDates[column.id] ?? ""}
                        disabled={addingTaskColumnId !== null}
                        onChange={(event) =>
                          setNewTaskDueDates((current) => ({
                            ...current,
                            [column.id]: event.target.value,
                          }))
                        }
                        onInput={(event) =>
                          setNewTaskDueDates((current) => ({
                            ...current,
                            [column.id]: event.currentTarget.value,
                          }))
                        }
                      />
                      {newTaskDueDates[column.id] ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={addingTaskColumnId !== null}
                          onClick={() =>
                            setNewTaskDueDates((current) => ({
                              ...current,
                              [column.id]: "",
                            }))
                          }
                        >
                          Usuń
                        </Button>
                      ) : null}
                    </div>
                  </Field>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={addingTaskColumnId !== null || !newTaskTitles[column.id]?.trim()}
                    onClick={() => void handleAddTask(column.id)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {addingTaskColumnId === column.id ? "Dodawanie…" : "Dodaj"}
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
          authorSide={authorSide}
          assigneeOptions={assigneeOptions}
          mentionOptions={mentionOptions}
          columns={board.columns.map((column) => ({ id: column.id, title: column.title }))}
          currentColumnId={activeTask.columnId}
          onMoveToColumn={async (columnId) => {
            const columnTasks = board.tasks.filter(
              (task) => task.columnId === columnId && task.id !== activeTask.id,
            );
            await moveKanbanTask(activeTask.id, columnId, columnTasks.length);
            await refresh();
          }}
          canDelete={authorSide === "team"}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={() => setActiveTaskId(null)}
          onSave={async (patch) => {
            const updated = await updateKanbanTask(activeTask.id, patch);
            setBoard((current) => {
              if (!current) {
                return current;
              }
              const nextBoard = {
                ...current,
                tasks: current.tasks.map((entry) => (entry.id === updated.id ? updated : entry)),
              };
              setCachedBoard(nextBoard);
              return nextBoard;
            });
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
              linkUrl: pathname,
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
