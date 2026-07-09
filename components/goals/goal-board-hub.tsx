"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, LayoutGrid, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoalBoardKindIcon } from "@/components/goals/goal-board-kind-icon";
import { CreateGoalBoardDialog } from "@/components/goals/create-goal-board-dialog";
import { EditGoalBoardDialog } from "@/components/goals/edit-goal-board-dialog";
import { isAdministratorRole } from "@/lib/auth/types";
import { useAuthStore } from "@/store/auth-store";
import { useGoalStore } from "@/store/goal-store";

export function GoalBoardHub() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = Boolean(profile && isAdministratorRole(profile.role));
  const boardKinds = useGoalStore((state) => state.boardKinds);
  const boards = useGoalStore((state) => state.boards);
  const boardCounts = useGoalStore((state) => state.boardCounts);
  const removeBoard = useGoalStore((state) => state.removeBoard);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteBoard(boardId: string, boardName: string) {
    if (
      !window.confirm(
        `Usunąć tablicę „${boardName}”? Wszystkie cele na tej tablicy zostaną trwale usunięte.`,
      )
    ) {
      return;
    }
    setDeletingId(boardId);
    setError(null);
    try {
      await removeBoard(boardId);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć tablicy.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const boardsByKind = new Map<string, typeof boards>();
  for (const board of boards) {
    boardsByKind.set(board.kind, [...(boardsByKind.get(board.kind) ?? []), board]);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/tablice-celow/zbiorcza"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <LayoutGrid className="h-4 w-4" />
            Widok zbiorczy
          </Link>
          <Link
            href="/tablice-celow/metodologie"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <BookOpen className="h-4 w-4" />
            Biblioteka metodologii
          </Link>
        </div>
        <CreateGoalBoardDialog boardKinds={boardKinds} />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-4">
        {boardKinds.map((kind) => {
          const kindBoards = boardsByKind.get(kind.code) ?? [];
          return (
            <Card key={kind.code}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-muted text-accent">
                    <GoalBoardKindIcon icon={kind.icon} className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle>{kind.label}</CardTitle>
                    <p className="text-xs text-muted">{kind.description}</p>
                  </div>
                </div>
                {kind.visibility === "admin_only" ? (
                  <Badge tone="critical">Tylko admin</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                {kindBoards.length === 0 ? (
                  <p className="text-sm text-muted">Brak tablic tego typu — utwórz pierwszą.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {kindBoards.map((board) => {
                      const counts = boardCounts[board.id];
                      return (
                        <div
                          key={board.id}
                          className="group relative rounded-xl border border-border/70 bg-surface-muted/30 p-3 transition hover:border-accent/40 hover:bg-surface-muted/50"
                        >
                          <Link href={`/tablice-celow/${board.id}`} className="block">
                            <p className="truncate pr-12 text-sm font-semibold text-foreground">
                              {board.name}
                            </p>
                            {board.description ? (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{board.description}</p>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone="neutral">{counts?.total ?? 0} celów</Badge>
                              {counts && counts.atRisk > 0 ? (
                                <Badge tone="critical">{counts.atRisk} zagrożonych</Badge>
                              ) : null}
                            </div>
                          </Link>
                          {isAdmin ? (
                            <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                              <EditGoalBoardDialog board={board} />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted hover:text-rose-400"
                                disabled={deletingId === board.id}
                                onClick={() => void handleDeleteBoard(board.id, board.name)}
                                aria-label="Usuń tablicę"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
