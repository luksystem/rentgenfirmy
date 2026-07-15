"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LayoutGrid, List, Loader2, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  KanbanDropPlaceholder,
  getKanbanColumnDropTargetClasses,
} from "@/components/process/kanban-drop-placeholder";
import { KanbanMobileColumnNav } from "@/components/process/kanban-mobile-column-nav";
import { useKanbanMobileColumns } from "@/hooks/use-kanban-mobile-columns";
import {
  KANBAN_BOARD_ROOT_CLASS,
  KANBAN_DRAG_HINT,
  KANBAN_MOBILE_COLUMN_BODY_CLASS,
  KANBAN_MOBILE_COLUMN_SHELL_CLASS,
  KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS,
} from "@/lib/process/kanban-ui";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { GoalCard } from "@/components/goals/goal-card";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { GoalDetailDialog } from "@/components/goals/goal-detail-dialog";
import { GoalSettlementGateDialog } from "@/components/goals/goal-settlement-gate-dialog";
import { Select } from "@/components/ui/input";
import {
  collectGoalBoardOwnerOptions,
  countActiveGoalBoardFilters,
  EMPTY_GOAL_BOARD_FILTERS,
  filterGoalsForBoard,
  type GoalBoardFilters,
} from "@/lib/goals/goal-board-filters";
import {
  GOAL_BOARD_COLUMNS,
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUSES,
  GOAL_STATUS_LABELS,
  type Goal,
  type GoalPriority,
  type GoalStatus,
} from "@/lib/goals/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore, EMPTY_GOALS, EMPTY_GOAL_CARD_META } from "@/store/goal-store";
import { GoalAiBulkImportPanel } from "@/components/goals/goal-ai-bulk-import-panel";

const DENSITY_STORAGE_KEY = "goals-card-density";

function goalBoardFiltersStorageKey(boardId: string) {
  return `goal-board-filters:${boardId}`;
}

function readStoredGoalBoardFilters(boardId: string): GoalBoardFilters {
  if (typeof window === "undefined") {
    return EMPTY_GOAL_BOARD_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(goalBoardFiltersStorageKey(boardId));
    if (!raw) {
      return EMPTY_GOAL_BOARD_FILTERS;
    }
    const parsed = JSON.parse(raw) as Partial<GoalBoardFilters>;
    return {
      ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : "all",
      status:
        parsed.status === "all" || (parsed.status && GOAL_STATUSES.includes(parsed.status))
          ? (parsed.status ?? "all")
          : "all",
      priority:
        parsed.priority === "all" || (parsed.priority && GOAL_PRIORITIES.includes(parsed.priority))
          ? (parsed.priority ?? "all")
          : "all",
    };
  } catch {
    return EMPTY_GOAL_BOARD_FILTERS;
  }
}

export function GoalBoardView({ boardId }: { boardId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const board = useGoalStore((state) => state.boards.find((entry) => entry.id === boardId));
  const goals = useGoalStore((state) => state.goalsByBoard[boardId] ?? EMPTY_GOALS);
  const meta = useGoalStore((state) => state.goalCardMetaByBoard[boardId] ?? EMPTY_GOAL_CARD_META);
  const isLoading = useGoalStore((state) => state.loadingBoardIds[boardId] ?? false);
  const ensureBoardGoals = useGoalStore((state) => state.ensureBoardGoals);
  const moveGoalStatus = useGoalStore((state) => state.moveGoalStatus);
  const updateGoalQuickFields = useGoalStore((state) => state.updateGoalQuickFields);
  const getOwnerName = useGoalStore((state) => state.getOwnerName);

  const [dragGoalId, setDragGoalId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<GoalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [filters, setFilters] = useState<GoalBoardFilters>(EMPTY_GOAL_BOARD_FILTERS);
  const [density, setDensity] = useState<"normal" | "slim">("normal");
  const [openGoal, setOpenGoal] = useState<Goal | null>(null);
  const [settlementGateGoal, setSettlementGateGoal] = useState<Goal | null>(null);

  useEffect(() => {
    void ensureBoardGoals(boardId);
  }, [boardId, ensureBoardGoals]);

  useEffect(() => {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === "slim" || stored === "normal") {
      setDensity(stored);
    }
  }, []);

  useEffect(() => {
    setFilters(readStoredGoalBoardFilters(boardId));
  }, [boardId]);

  useEffect(() => {
    window.localStorage.setItem(goalBoardFiltersStorageKey(boardId), JSON.stringify(filters));
  }, [boardId, filters]);

  function handleDensityChange(next: "normal" | "slim") {
    setDensity(next);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
  }

  const activeFilterCount = countActiveGoalBoardFilters(filters);
  const ownerOptions = useMemo(
    () => collectGoalBoardOwnerOptions(goals, getOwnerName),
    [goals, getOwnerName],
  );
  const filteredGoals = useMemo(
    () => filterGoalsForBoard(goals, filters, { showCancelled }),
    [goals, filters, showCancelled],
  );
  const showCancelledColumn = showCancelled || filters.status === "cancelled";

  const columns = useMemo(() => {
    const base = GOAL_BOARD_COLUMNS.map((status) => ({ id: status, title: GOAL_STATUS_LABELS[status] }));
    if (showCancelledColumn) {
      base.push({ id: "cancelled" as GoalStatus, title: GOAL_STATUS_LABELS.cancelled });
    }
    return base;
  }, [showCancelledColumn]);
  const { activeColumnId, scrollerRef, scrollToColumn, setColumnRef } = useKanbanMobileColumns(columns);

  const grouped = useMemo(() => {
    const map = new Map<GoalStatus, Goal[]>();
    for (const status of GOAL_BOARD_COLUMNS) {
      map.set(status, []);
    }
    if (showCancelledColumn) {
      map.set("cancelled", []);
    }
    for (const goal of filteredGoals) {
      const bucket = map.get(goal.status) ?? [];
      bucket.push(goal);
      map.set(goal.status, bucket);
    }
    return map;
  }, [filteredGoals, showCancelledColumn]);

  const maxColumnCount = Math.max(1, ...columns.map((column) => grouped.get(column.id)?.length ?? 0));

  async function handleStatusChange(goalId: string, status: GoalStatus) {
    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal || goal.status === status) {
      return;
    }
    if (status === "settled" && goal.methodologyId) {
      // Cel ma metodologię — zanim przejdzie do „Rozliczony”, wymagamy przeglądu
      // kluczowych wyników i kryteriów sukcesu (patrz GoalSettlementGateDialog).
      setSettlementGateGoal(goal);
      setDragGoalId(null);
      setDragOverColumn(null);
      return;
    }
    try {
      await moveGoalStatus(goal, status, profile?.id ?? null);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Nie udało się zmienić statusu.");
    } finally {
      setDragGoalId(null);
      setDragOverColumn(null);
    }
  }

  async function handleProgressChange(goal: Goal, progressPercent: number) {
    try {
      await updateGoalQuickFields(goal, { progressPercent }, profile?.id ?? null);
    } catch (progressError) {
      setError(progressError instanceof Error ? progressError.message : "Nie udało się zmienić realizacji.");
    }
  }

  async function handleDueDateChange(goal: Goal, periodEnd: string) {
    try {
      await updateGoalQuickFields(goal, { periodEnd }, profile?.id ?? null);
    } catch (dueDateError) {
      setError(dueDateError instanceof Error ? dueDateError.message : "Nie udało się zmienić daty.");
    }
  }

  if (!board) {
    return <p className="text-sm text-muted">Tablica nie została znaleziona.</p>;
  }

  return (
    <div className={cn(KANBAN_BOARD_ROOT_CLASS, "md:min-h-[calc(100vh-14rem)]")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Target className="h-4 w-4" />
          {filteredGoals.length === goals.length
            ? `${goals.length} ${goals.length === 1 ? "cel" : "celów"} na tablicy`
            : `${filteredGoals.length} z ${goals.length} ${goals.length === 1 ? "cela" : "celów"}`}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-border/70">
            <button
              type="button"
              onClick={() => handleDensityChange("normal")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition",
                density === "normal" ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-muted",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Standard
            </button>
            <button
              type="button"
              onClick={() => handleDensityChange("slim")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition",
                density === "slim" ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-muted",
              )}
            >
              <List className="h-3.5 w-3.5" />
              Slim
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCancelled((current) => !current)}
          >
            {showCancelled ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showCancelled ? "Skryj anulowane" : "Pokaż anulowane"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void ensureBoardGoals(boardId, { force: true })}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Odśwież
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/tablice-celow/przeglad?boardId=${boardId}`}>Przegląd celów</Link>
          </Button>
          <CreateGoalDialog boardId={boardId} />
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}

      <MobileFiltersPanel
        activeCount={activeFilterCount}
        onClear={() => setFilters(EMPTY_GOAL_BOARD_FILTERS)}
        className="mb-3"
      >
        <Select
          value={filters.ownerId}
          onChange={(event) => setFilters((current) => ({ ...current, ownerId: event.target.value }))}
          className="w-full md:w-auto"
        >
          <option value="all">Wszyscy pracownicy</option>
          {ownerOptions.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({ ...current, status: event.target.value as GoalStatus | "all" }))
          }
          className="w-full md:w-auto"
        >
          <option value="all">Wszystkie statusy</option>
          {GOAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {GOAL_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.priority}
          onChange={(event) =>
            setFilters((current) => ({ ...current, priority: event.target.value as GoalPriority | "all" }))
          }
          className="w-full md:w-auto"
        >
          <option value="all">Wszystkie priorytety</option>
          {GOAL_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {GOAL_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
      </MobileFiltersPanel>

      <GoalAiBulkImportPanel
        boardId={boardId}
        boardKind={board.kind}
        onCreated={() => void ensureBoardGoals(boardId, { force: true })}
      />

      <KanbanMobileColumnNav
        columns={columns}
        activeColumnId={activeColumnId}
        onSelect={scrollToColumn}
        openCountForColumn={(columnId) => (grouped.get(columnId as GoalStatus) ?? []).length}
      />

      <p className="mb-3 hidden shrink-0 text-sm text-muted md:block">{KANBAN_DRAG_HINT}</p>

      <div ref={scrollerRef} className={KANBAN_MOBILE_COLUMNS_SCROLLER_CLASS}>
        {columns.map((column) => {
          const columnGoals = grouped.get(column.id) ?? [];
          const isDropTarget = Boolean(dragGoalId && dragOverColumn === column.id);

          return (
            <section
              key={column.id}
              ref={(node) => setColumnRef(column.id, node as HTMLDivElement | null)}
              data-column-id={column.id}
              className={cn(KANBAN_MOBILE_COLUMN_SHELL_CLASS, getKanbanColumnDropTargetClasses(isDropTarget))}
              style={{ minHeight: `${Math.max(220, maxColumnCount * 168)}px` }}
              onDragEnter={(event) => {
                if (!dragGoalId) return;
                event.preventDefault();
                setDragOverColumn(column.id);
              }}
              onDragOver={(event) => {
                if (!dragGoalId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumn(column.id);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(related)) {
                  setDragOverColumn((current) => (current === column.id ? null : current));
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const goalId = event.dataTransfer.getData("text/plain") || dragGoalId;
                if (goalId) {
                  void handleStatusChange(goalId, column.id);
                }
              }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{column.title}</p>
                  <p className="text-xs text-muted">
                    {columnGoals.length === 1 ? "1 cel" : `${columnGoals.length} celów`}
                  </p>
                </div>
                <span className="rounded-full border border-border/70 bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-muted">
                  {columnGoals.length}
                </span>
              </header>

              <div className={cn(KANBAN_MOBILE_COLUMN_BODY_CLASS, isDropTarget && "bg-accent/[0.03]")}>
                {dragGoalId && isDropTarget ? <KanbanDropPlaceholder /> : null}
                {columnGoals.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Brak celów</p>
                ) : (
                  columnGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      meta={meta[goal.id]}
                      ownerName={getOwnerName(goal.ownerId)}
                      draggable
                      compact={density === "slim"}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", goal.id);
                        setDragGoalId(goal.id);
                      }}
                      onDragEnd={() => {
                        setDragGoalId(null);
                        setDragOverColumn(null);
                      }}
                      onOpen={() => setOpenGoal(goal)}
                      onStatusChange={(status) => void handleStatusChange(goal.id, status)}
                      onProgressChange={(percent) => void handleProgressChange(goal, percent)}
                      onDueDateChange={(date) => void handleDueDateChange(goal, date)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <GoalDetailDialog
        goalId={openGoal?.id ?? null}
        goalName={openGoal?.name}
        open={Boolean(openGoal)}
        onOpenChange={(next) => {
          if (!next) setOpenGoal(null);
        }}
      />

      <GoalSettlementGateDialog
        goal={settlementGateGoal}
        open={Boolean(settlementGateGoal)}
        onOpenChange={(next) => {
          if (!next) setSettlementGateGoal(null);
        }}
        currentProfileId={profile?.id ?? null}
        onSettled={() => {
          setSettlementGateGoal(null);
          void ensureBoardGoals(boardId, { force: true });
        }}
      />
    </div>
  );
}
