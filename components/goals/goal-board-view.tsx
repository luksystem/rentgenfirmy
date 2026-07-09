"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Target } from "lucide-react";
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
import { GoalCard } from "@/components/goals/goal-card";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { GOAL_BOARD_COLUMNS, GOAL_STATUS_LABELS, type Goal, type GoalStatus } from "@/lib/goals/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

export function GoalBoardView({ boardId }: { boardId: string }) {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const board = useGoalStore((state) => state.boards.find((entry) => entry.id === boardId));
  const goals = useGoalStore((state) => state.goalsByBoard[boardId] ?? []);
  const meta = useGoalStore((state) => state.goalCardMetaByBoard[boardId] ?? {});
  const isLoading = useGoalStore((state) => state.loadingBoardIds[boardId] ?? false);
  const ensureBoardGoals = useGoalStore((state) => state.ensureBoardGoals);
  const moveGoalStatus = useGoalStore((state) => state.moveGoalStatus);
  const getOwnerName = useGoalStore((state) => state.getOwnerName);

  const [dragGoalId, setDragGoalId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<GoalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureBoardGoals(boardId);
  }, [boardId, ensureBoardGoals]);

  const columns = useMemo(
    () => GOAL_BOARD_COLUMNS.map((status) => ({ id: status, title: GOAL_STATUS_LABELS[status] })),
    [],
  );
  const { activeColumnId, scrollerRef, scrollToColumn, setColumnRef } = useKanbanMobileColumns(columns);

  const grouped = useMemo(() => {
    const map = new Map<GoalStatus, Goal[]>();
    for (const status of GOAL_BOARD_COLUMNS) {
      map.set(status, []);
    }
    for (const goal of goals) {
      if (goal.status === "cancelled") continue;
      const bucket = map.get(goal.status) ?? [];
      bucket.push(goal);
      map.set(goal.status, bucket);
    }
    return map;
  }, [goals]);

  const maxColumnCount = Math.max(1, ...GOAL_BOARD_COLUMNS.map((status) => grouped.get(status)?.length ?? 0));

  async function handleDrop(goalId: string, status: GoalStatus) {
    const goal = goals.find((entry) => entry.id === goalId);
    if (!goal || goal.status === status) {
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

  if (!board) {
    return <p className="text-sm text-muted">Tablica nie została znaleziona.</p>;
  }

  return (
    <div className={cn(KANBAN_BOARD_ROOT_CLASS, "md:min-h-[calc(100vh-14rem)]")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Target className="h-4 w-4" />
          {goals.length} {goals.length === 1 ? "cel" : "celów"} na tablicy
        </div>
        <div className="flex items-center gap-2">
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
          <CreateGoalDialog boardId={boardId} />
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}

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
                  void handleDrop(goalId, column.id);
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
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", goal.id);
                        setDragGoalId(goal.id);
                      }}
                      onDragEnd={() => {
                        setDragGoalId(null);
                        setDragOverColumn(null);
                      }}
                      onOpen={() => router.push(`/tablice-celow/${boardId}/${goal.id}`)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
